import React, { useState, useRef, useEffect, useCallback, useContext } from 'react';
import {
  Box,
  Paper,
  IconButton,
  Typography,
  TextField,
  List,
  ListItem,
  ListItemText,
  Fab,
  Collapse,
  Chip,
  Avatar,
  CircularProgress,
  Alert,
  Divider,
  Menu,
  MenuItem,
  Switch,
  FormControlLabel,
  Tooltip,
  Card,
  CardContent,
  ListItemIcon,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  FormControl,
  InputLabel,
  Select,
  ToggleButton,
  ToggleButtonGroup,
  Slider,
  Button,
  Stack,
  Grid,
  Tabs,
  Tab,
  Badge,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  ToggleButtonGroup as FilterToggleGroup
} from '@mui/material';
import {
  Psychology as AIIcon,
  Close as CloseIcon,
  DragIndicator as DragIcon,
  Send as SendIcon,
  History as HistoryIcon,
  Security as SecurityIcon,
  Info as InfoIcon,
  Terminal as TerminalIcon,
  Visibility as EyeIcon,
  Code as CodeIcon,
  Settings as SettingsIcon,
  Minimize as MinimizeIcon,
  Maximize as MaximizeIcon,
  OpenInFull as ResizeIcon,
  ExpandMore as ExpandMoreIcon,
  Palette as PaletteIcon,
  Language as LanguageIcon,
  AutoMode as AutoModeIcon,
  Speed as SpeedIcon,
  Storage as StorageIcon,
  CloudQueue as CloudIcon,
  Analytics as AnalyticsIcon,
  Download as DownloadIcon,
  PersonOutline as PersonIcon,
  School as SchoolIcon,
  Build as BuildIcon,
  Engineering as EngineeringIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  BugReport as BugIcon,
  Task as TaskIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  CheckCircle as CheckIcon,
  Clear as ClearIcon,
  FilterList as FilterIcon,
  Visibility as ShowIcon,
  VisibilityOff as HideIcon
} from '@mui/icons-material';
import { useAuth } from '../../context/AuthContext';
import { useLocation } from 'react-router-dom';
import { useGlobalErrorStore, GlobalError } from '../../hooks/useGlobalErrorStore';
import { KanbanDataContext } from '../../context/kanbancontext';
import ErrorDetailsCard from './ErrorDetailsCard';

interface OMAICommand {
  id: string;
  command: string;
  timestamp: string;
  result?: string;
  status: 'pending' | 'success' | 'error';
  context?: string;
}

interface PageContext {
  pathname: string;
  componentName?: string;
  dbModel?: string;
  userRole: string;
  churchId?: string;
  description?: string;
}

interface OMAISettings {
  // Core Assistant Settings
  handsOnModeEnabled: boolean;
  destructiveCommandsWarning: boolean;
  defaultAIMode: 'passive' | 'assistive' | 'hands-on';
  defaultLanguage: string;
  uiTheme: 'light' | 'dark' | 'orthodox-blue' | 'custom';
  
  // OMAI Behavior Settings
  autonomousActions: boolean;
  errorRecoveryMode: 'auto-refresh' | 'retry' | 'report';
  verbosityLevel: 'minimal' | 'normal' | 'debug';
  agentPersonality: 'classic' | 'liturgical' | 'debugging-expert' | 'project-manager' | 'orthodox-educator';
  
  // Backend Integration
  databaseContextOverride: string;
  serviceEnvironment: 'prod' | 'dev' | 'sandbox';
  
  // Logs & Analytics
  showMetrics: boolean;
  exportLogsFormat: 'json' | 'csv' | 'txt';
  trackExecutionTime: boolean;
  trackQueryCount: boolean;
  trackSuccessRate: boolean;
}

const GlobalOMAI: React.FC = () => {
  const { user } = useAuth();
  const location = useLocation();
  const { 
    errors, 
    filteredErrors, 
    stats, 
    filter, 
    setFilter,
    addError, 
    resolveError, 
    dismissError, 
    undismissError,
    toggleErrorExpansion,
    deleteError, 
    clearErrors,
    clearDismissedErrors
  } = useGlobalErrorStore();
  const kanbanContext = useContext(KanbanDataContext);
  const { createTask, boards = [], currentBoard, fetchBoard, fetchBoards } = kanbanContext || {};
  
  // UI State
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [position, setPosition] = useState({ x: window.innerWidth - 600, y: window.innerHeight / 2 - 500 });
  const [size, setSize] = useState({ width: 600, height: 800 });
  const [command, setCommand] = useState('');
  const [isExecuting, setIsExecuting] = useState(false);
  const [handsOnMode, setHandsOnMode] = useState(false);
  const [historyMenuAnchor, setHistoryMenuAnchor] = useState<null | HTMLElement>(null);
  const [showSettings, setShowSettings] = useState(false);
  
  // Tab state for new Errors panel
  const [activeTab, setActiveTab] = useState(0);
  const [selectedError, setSelectedError] = useState<GlobalError | null>(null);
  const [taskCreationDialog, setTaskCreationDialog] = useState(false);
  const [taskForm, setTaskForm] = useState({
    title: '',
    description: '',
    priority: 'medium' as 'low' | 'medium' | 'high' | 'urgent'
  });
  
  // Error filtering state
  const [showFilters, setShowFilters] = useState(false);
  
  // Data State
  const [commandHistory, setCommandHistory] = useState<OMAICommand[]>([]);
  const [pageContext, setPageContext] = useState<PageContext | null>(null);
  const [availableCommands, setAvailableCommands] = useState<string[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  
  // Settings State (keeping existing settings)
  const [settings, setSettings] = useState<OMAISettings>({
    // Core Assistant Settings
    handsOnModeEnabled: false,
    destructiveCommandsWarning: true,
    defaultAIMode: 'assistive',
    defaultLanguage: 'en-US',
    uiTheme: 'orthodox-blue',
    
    // OMAI Behavior Settings
    autonomousActions: false,
    errorRecoveryMode: 'report',
    verbosityLevel: 'normal',
    agentPersonality: 'classic',
    
    // Backend Integration
    databaseContextOverride: 'auto',
    serviceEnvironment: 'prod',
    
    // Logs & Analytics
    showMetrics: true,
    exportLogsFormat: 'json',
    trackExecutionTime: true,
    trackQueryCount: true,
    trackSuccessRate: true,
  });

  // Refs
  const dragRef = useRef<HTMLDivElement>(null);
  const commandInputRef = useRef<HTMLInputElement>(null);

  // Only show for super_admin users
  if (!user || user.role !== 'super_admin') {
    return null;
  }

  // Listen for global errors and add them to the store
  useEffect(() => {
    const handleGlobalError = (event: CustomEvent) => {
      addError(event.detail);
    };

    window.addEventListener('omai-error', handleGlobalError as EventListener);
    
    return () => {
      window.removeEventListener('omai-error', handleGlobalError as EventListener);
    };
  }, [addError]);

  // Initialize page context when location changes
  useEffect(() => {
    updatePageContext();
  }, [location, user]);

  // Load command history and available commands
  useEffect(() => {
    loadCommandHistory();
    loadAvailableCommands();
    
    // Load saved settings from localStorage
    const savedSettings = localStorage.getItem('omai_settings');
    if (savedSettings) {
      try {
        const parsedSettings = JSON.parse(savedSettings);
        setSettings(parsedSettings);
        setHandsOnMode(parsedSettings.handsOnModeEnabled);
      } catch (error) {
        console.error('Failed to load OMAI settings:', error);
      }
    }
  }, []);

  const updatePageContext = () => {
    const context: PageContext = {
      pathname: location.pathname,
      userRole: user?.role || 'unknown',
      churchId: user?.church_id?.toString(),
      componentName: getComponentNameFromPath(location.pathname),
      dbModel: getDbModelFromPath(location.pathname),
      description: getPageDescription(location.pathname)
    };
    setPageContext(context);
    generateContextualSuggestions(context);
  };

  const getComponentNameFromPath = (pathname: string): string => {
    const pathMap: { [key: string]: string } = {
      '/admin/ai': 'AI Administration Panel',
      '/admin/bigbook': 'OM Big Book Console',
      '/admin/build': 'Build Console',
      '/admin/users': 'User Management',
      '/apps/records-ui': 'Church Records Browser',
      '/apps/records': 'Records Dashboard',
      '/apps/kanban': 'Kanban Board',
      '/omb/editor': 'OMB Editor',
      '/dashboards/modern': 'Modern Dashboard',
      '/admin/orthodox-metrics': 'Orthodox Metrics Dashboard'
    };
    return pathMap[pathname] || 'Unknown Component';
  };

  const getDbModelFromPath = (pathname: string): string => {
    if (pathname.includes('records')) return 'church_records';
    if (pathname.includes('users')) return 'users';
    if (pathname.includes('church')) return 'churches';
    if (pathname.includes('ai')) return 'ai_metrics';
    if (pathname.includes('kanban')) return 'orthodoxmetrics_db';
    return 'orthodoxmetrics_db'; // Default to main application database
  };

  const getPageDescription = (pathname: string): string => {
    const descriptions: { [key: string]: string } = {
      '/admin/ai': 'AI system monitoring and configuration',
      '/admin/bigbook': 'Big Book content management and AI learning',
      '/admin/build': 'Frontend build and deployment console',
      '/admin/users': 'User account and permission management',
      '/apps/records-ui': 'Professional church records browser with filtering',
      '/apps/records': 'Card-based records dashboard',
      '/omb/editor': 'Visual component editor and builder'
    };
    return descriptions[pathname] || 'OrthodoxMetrics application page';
  };

  const generateContextualSuggestions = (context: PageContext) => {
    const suggestions: string[] = [];
    
    if (context.pathname.includes('records')) {
      suggestions.push('show record counts', 'export recent records', 'explain this page');
    } else if (context.pathname.includes('build')) {
      suggestions.push('check build status', 'restart build', 'show logs');
    } else if (context.pathname.includes('ai')) {
      suggestions.push('ai status', 'restart ai services', 'show metrics');
    } else if (context.pathname.includes('users')) {
      suggestions.push('show active users', 'list permissions', 'check sessions');
    }
    
    // Add error-related suggestions
    if (stats.unresolved > 0) {
      suggestions.push('omai errors', `show ${stats.unresolved} errors`, 'clear errors');
    }
    
    suggestions.push('help', 'status', 'refresh page');
    setSuggestions(suggestions);
  };

  const loadCommandHistory = async () => {
    try {
      const response = await fetch('/api/omai/command-history', {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        setCommandHistory(data.history || []);
      }
    } catch (error) {
      console.error('Failed to load command history:', error);
    }
  };

  const loadAvailableCommands = async () => {
    try {
      const response = await fetch('/api/omai/available-commands', {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        setAvailableCommands(data.commands || []);
      }
    } catch (error) {
      console.error('Failed to load available commands:', error);
    }
  };

  // Enhanced executeCommand to handle error commands
  const executeCommand = async (commandText: string) => {
    if (!commandText.trim()) return;

    // Handle special error commands
    if (commandText.toLowerCase().startsWith('omai errors')) {
      setActiveTab(1); // Switch to Errors tab
      return;
    }
    
    if (commandText.toLowerCase().includes('clear errors')) {
      clearErrors();
      return;
    }
    
    const errorIdMatch = commandText.match(/omai taskify (.+)/);
    if (errorIdMatch) {
      const errorId = errorIdMatch[1];
      const error = errors.find(e => e.id === errorId);
      if (error) {
        setSelectedError(error);
        setTaskCreationDialog(true);
      }
      return;
    }

    setIsExecuting(true);
    const commandId = `cmd_${Date.now()}`;
    
    const newCommand: OMAICommand = {
      id: commandId,
      command: commandText,
      timestamp: new Date().toISOString(),
      status: 'pending',
      context: pageContext?.pathname
    };

    setCommandHistory(prev => [newCommand, ...prev.slice(0, 9)]);
    setCommand('');

    try {
             const response = await fetch('/api/omai/execute-command', {
         method: 'POST',
         headers: {
           'Content-Type': 'application/json'
         },
         credentials: 'include',
         body: JSON.stringify({
           command: commandText,
           context: pageContext,
           handsOnMode: settings.handsOnModeEnabled,
           settings: settings
         })
       });

      const result = await response.json();
      
      const updatedCommand: OMAICommand = {
        ...newCommand,
        status: result.success ? 'success' : 'error',
        result: result.message || result.error
      };

      setCommandHistory(prev => 
        prev.map(cmd => cmd.id === commandId ? updatedCommand : cmd)
      );

      // Handle special commands
      if (result.action) {
        handleSpecialAction(result.action, result.data);
      }

    } catch (error) {
      const errorCommand: OMAICommand = {
        ...newCommand,
        status: 'error',
        result: 'Failed to execute command'
      };

      setCommandHistory(prev => 
        prev.map(cmd => cmd.id === commandId ? errorCommand : cmd)
      );
    } finally {
      setIsExecuting(false);
    }
  };

  const handleSpecialAction = (action: string, data: any) => {
    switch (action) {
      case 'refresh_page':
        window.location.reload();
        break;
      case 'navigate':
        window.location.href = data.url;
        break;
      case 'open_panel':
        // Open specific admin panels
        break;
      case 'show_logs':
        // Display logs in a modal or redirect
        break;
    }
  };

  // Helper function to automatically select a suitable board for bug tracking
  const autoSelectBugsBoard = async () => {
    try {
      if (!fetchBoards || !fetchBoard) {
        console.log('Kanban context functions not available');
        alert('Kanban context not available. Please ensure you are logged in and have access to Kanban boards.');
        return false;
      }

      console.log('Refreshing boards list...');
      console.log('User context:', user);
      console.log('Current location:', location.pathname);
      
      // First, refresh the boards list
      await fetchBoards();
      
      // If we're on the Kanban page, try to get the selected board from the page
      if (location.pathname.includes('/kanban')) {
        console.log('We are on Kanban page, checking for selected board in page state...');
        
        // Try to find the Bugs board by ID from the page's selection
        const urlParams = new URLSearchParams(window.location.search);
        const selectedBoardId = urlParams.get('board');
        
        if (selectedBoardId) {
          console.log('Found board ID in URL:', selectedBoardId);
          if (fetchBoard) {
            try {
              await fetchBoard(parseInt(selectedBoardId));
              console.log('Successfully loaded board from URL parameter');
            } catch (error) {
              console.error('Failed to load board from URL:', error);
            }
          }
        } else {
          console.log('No board ID in URL, trying to detect from page selection...');
          
          // Check if there's a board selection button that's active
          const activeButton = document.querySelector('[data-testid="board-selector"] .active, .MuiButton-contained');
          if (activeButton) {
            console.log('Found active board button:', activeButton.textContent);
          }
        }
      }
      
      // Also try to directly test the API
      try {
        const response = await fetch('/api/kanban/boards', {
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        console.log('Direct API response status:', response.status);
        console.log('Direct API response headers:', Object.fromEntries(response.headers.entries()));
        
        if (response.ok) {
          const data = await response.json();
          console.log('Direct API response data:', data);
          
          // If we found boards in the direct API call, try to manually load them
          if (data.success && data.boards && data.boards.length > 0) {
            console.log(`Found ${data.boards.length} boards via direct API call:`);
            data.boards.forEach((board: any, index: number) => {
              console.log(`  ${index + 1}. ${board.name} (ID: ${board.id})`);
            });
            
            // Look for a bugs board
            const bugsBoard = data.boards.find((board: any) => 
              board.name.toLowerCase().includes('bug') ||
              board.name.toLowerCase().includes('issue') ||
              board.name.toLowerCase().includes('error')
            );
            
            if (bugsBoard && fetchBoard) {
              console.log('Found bugs board via direct API, attempting to load:', bugsBoard);
              try {
                await fetchBoard(bugsBoard.id);
                alert(`✅ Successfully loaded "${bugsBoard.name}" board via direct API!`);
                return true;
              } catch (fetchError) {
                console.error('Failed to fetch board details:', fetchError);
                alert(`❌ Found "${bugsBoard.name}" but failed to load details: ${fetchError}`);
              }
            } else if (data.boards.length > 0 && fetchBoard) {
              // Use first available board
              const firstBoard = data.boards[0];
              console.log('No bugs board found, using first available:', firstBoard);
              try {
                await fetchBoard(firstBoard.id);
                alert(`✅ Successfully loaded "${firstBoard.name}" board (first available)!`);
                return true;
              } catch (fetchError) {
                console.error('Failed to fetch first board details:', fetchError);
                alert(`❌ Found "${firstBoard.name}" but failed to load details: ${fetchError}`);
              }
            }
          } else {
            console.log('Direct API returned success but no boards found');
            alert('❌ API worked but returned no boards. Check user permissions.');
          }
        } else {
          const errorText = await response.text();
          console.error('Direct API error:', errorText);
          alert(`❌ Direct API error: ${response.status} - ${errorText}`);
        }
      } catch (apiError) {
        console.error('Direct API call failed:', apiError);
      }
      
      // Wait a moment for state to update
      await new Promise(resolve => setTimeout(resolve, 500));
      
      console.log('Current boards after refresh:', boards);
      
      if (boards && boards.length > 0) {
        // Look for a board named "Bugs" or similar
        const bugsBoard = boards.find(board => 
          board.name.toLowerCase().includes('bug') ||
          board.name.toLowerCase().includes('issue') ||
          board.name.toLowerCase().includes('error')
        );
        
        if (bugsBoard) {
          console.log('Found bugs board:', bugsBoard);
          await fetchBoard(bugsBoard.id);
          alert(`✅ Successfully selected "${bugsBoard.name}" board!`);
          return true;
        } else {
          // Use the first available board
          console.log('No bugs board found, using first available:', boards[0]);
          await fetchBoard(boards[0].id);
          alert(`✅ Selected "${boards[0].name}" board (no bugs-specific board found).`);
          return true;
        }
      } else {
        console.error('No boards available after refresh');
        alert('❌ No Kanban boards found. Please create a board first on the Kanban page.');
        return false;
      }
    } catch (error) {
      console.error('Failed to auto-select bugs board:', error);
      alert(`❌ Failed to select board: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return false;
    }
  };

  // Enhanced task creation from error with automatic Bug column detection
  const handleCreateTaskFromError = async (error?: GlobalError) => {
    const targetError = error || selectedError;
    if (!targetError) {
      console.error('No error selected for task creation');
      return;
    }

    try {
      console.log('Creating task from error:', targetError);
      console.log('Current board:', currentBoard);
      console.log('Available boards:', boards);

      // Check if we have a current board, if not try to auto-select one
      if (!currentBoard) {
        console.log('No current board available. Attempting to auto-select...');
        const boardSelected = await autoSelectBugsBoard();
        
        if (!boardSelected || !currentBoard) {
          console.error('No current board available. Available boards:', boards);
          alert(`No Kanban board is currently selected. Available boards: ${boards?.length || 0}. Please visit the Kanban page and select a board first, or create a board named "Bugs" for automatic detection.`);
          return;
        }
        
        console.log('Successfully auto-selected board:', currentBoard);
      }

      // Find "Bugs" column or use the first available column
      let bugsColumnId = null;
      
      if (currentBoard?.columns && Array.isArray(currentBoard.columns) && currentBoard.columns.length > 0) {
        // First, try to find a bugs/issues column
        const bugsColumn = currentBoard.columns.find(col => 
          col.name.toLowerCase().includes('bug') || 
          col.name.toLowerCase().includes('issue') ||
          col.name.toLowerCase().includes('error') ||
          col.name.toLowerCase().includes('backlog') ||
          col.name.toLowerCase().includes('todo')
        );
        
        if (bugsColumn) {
          bugsColumnId = bugsColumn.id;
          console.log('Found bugs column:', bugsColumn);
        } else {
          // Use the first column as fallback
          bugsColumnId = currentBoard.columns[0].id;
          console.log('Using first available column:', currentBoard.columns[0]);
        }
      } else {
        console.error('No columns available in current board');
        alert('No columns available in the current Kanban board. Please create columns first.');
        return;
      }

      // Determine which board to use for the task
      const targetBoardId = currentBoard.id;
      console.log('Target board ID:', targetBoardId);
      console.log('Target column ID:', bugsColumnId);

      const taskTitle = taskForm.title || `🐛 Fix: ${targetError.message.substring(0, 50)}...`;
      const taskDescription = taskForm.description || generateTaskDescription(targetError);

      const taskData = {
        board_id: targetBoardId,
        column_id: bugsColumnId,
        title: taskTitle,
        description: taskDescription,
        priority: determinePriorityFromSeverity(targetError.severity),
        assigned_to: user?.id,
        created_by: user?.id,
        status: 'todo',
        position: 0, // Add to top of column
        labels: []  // Simplified for now to avoid potential issues
      };

      console.log('Task data being sent:', taskData);

      if (createTask) {
        await createTask(taskData);
      } else {
        throw new Error('Kanban task creation is not available. Please ensure the Kanban context is loaded.');
      }
      console.log('Task created successfully!');
      
      // Mark error as resolved with task reference
      resolveError(targetError.id);
      
      setTaskCreationDialog(false);
      setSelectedError(null);
      setTaskForm({ title: '', description: '', priority: 'medium' });
      
      // Show success message
      alert(`✅ Bug task created successfully in "${currentBoard.name}" board!`);
      
    } catch (error) {
      console.error('Failed to create task from error:', error);
      alert(`❌ Failed to create task: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const determinePriorityFromSeverity = (severity: GlobalError['severity']): 'low' | 'medium' | 'high' | 'urgent' => {
    switch (severity) {
      case 'critical': return 'urgent';
      case 'high': return 'high';
      case 'medium': return 'medium';
      case 'low': return 'low';
      default: return 'medium';
    }
  };

  const generateTaskDescription = (error: GlobalError): string => {
    return `## 🐛 Bug Report

**Error Hash:** \`${error.hash}\`
**Severity:** ${error.severity.toUpperCase()}
**Occurrences:** ${error.occurrenceCount}

### 📍 Location
- **Component:** ${error.component || 'Unknown'}
- **Route:** \`${error.route}\`
- **File:** \`${error.filename || 'N/A'}\`${error.lineno ? `:${error.lineno}` : ''}

### 💬 Error Message
\`\`\`
${error.message}
\`\`\`

### 🔍 Stack Trace
\`\`\`
${error.stack || 'No stack trace available'}
\`\`\`

### ⏰ Timeline
- **First:** ${new Date(error.firstOccurrence).toLocaleString()}
- **Last:** ${new Date(error.lastOccurrence).toLocaleString()}
- **Count:** ${error.occurrenceCount} occurrence${error.occurrenceCount !== 1 ? 's' : ''}

### 🎯 Action Items
- [ ] Investigate root cause
- [ ] Reproduce error in dev environment  
- [ ] Implement fix
- [ ] Test fix thoroughly
- [ ] Deploy and monitor

### 🏷️ Tags
${error.tags?.join(', ') || 'None'}

### 🌐 Context
- **URL:** ${error.context?.url || 'N/A'}
- **User Role:** ${error.userRole || 'N/A'}
- **Viewport:** ${error.context?.viewport || 'N/A'}

---
*Auto-generated from OMAI Error Console*`;
  };

  const getSeverityColor = (severity: GlobalError['severity']): string => {
    switch (severity) {
      case 'critical': return '#d32f2f';
      case 'high': return '#f57c00';
      case 'medium': return '#1976d2';
      case 'low': return '#388e3c';
      default: return '#757575';
    }
  };

  const handleDragStart = useCallback((e: React.MouseEvent) => {
    if (!dragRef.current) return;
    setIsDragging(true);
    
    const rect = dragRef.current.getBoundingClientRect();
    const offsetX = e.clientX - rect.left;
    const offsetY = e.clientY - rect.top;

    const handleMouseMove = (e: MouseEvent) => {
      setPosition({
        x: Math.max(0, Math.min(window.innerWidth - size.width, e.clientX - offsetX)),
        y: Math.max(0, Math.min(window.innerHeight - size.height, e.clientY - offsetY))
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [size]);

  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setIsResizing(true);

    const handleMouseMove = (e: MouseEvent) => {
      const newWidth = Math.max(400, Math.min(1200, e.clientX - position.x));
      const newHeight = Math.max(500, Math.min(1000, e.clientY - position.y));
      
      setSize({
        width: newWidth,
        height: newHeight
      });
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [position]);

  const handleCommandSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    executeCommand(command);
  };

  const handleSuggestionClick = (suggestion: string) => {
    setCommand(suggestion);
    executeCommand(suggestion);
  };

  const handleHistoryCommand = (historyCommand: OMAICommand) => {
    setCommand(historyCommand.command);
    setHistoryMenuAnchor(null);
  };

  // Enhanced Errors Tab Content with filtering and enhanced features
  const renderErrorsTab = () => (
    <Box>
      {/* Error Statistics Dashboard */}
      <Card sx={{ mb: 2, bgcolor: '#f8f9fa', border: '1px solid #e9ecef' }}>
        <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
          <Box display="flex" alignItems="center" gap={1} mb={2}>
            <ErrorIcon fontSize="small" sx={{ color: '#f57c00' }} />
            <Typography variant="subtitle2" fontWeight="bold" sx={{ color: '#424242' }}>
              Error Dashboard
            </Typography>
            <Box ml="auto" display="flex" gap={1}>
              <Tooltip title="Toggle Filters">
                <IconButton
                  size="small"
                  onClick={() => setShowFilters(!showFilters)}
                  sx={{ 
                    bgcolor: showFilters ? '#e3f2fd' : 'transparent',
                    color: showFilters ? '#1976d2' : '#666'
                  }}
                >
                  <FilterIcon />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>
          
          {/* Stats Grid */}
          <Grid container spacing={1} mb={2}>
            <Grid item xs={3}>
              <Chip 
                label={`Total: ${stats.total}`} 
                size="small" 
                sx={{ width: '100%', bgcolor: '#e0e0e0', color: '#424242', fontWeight: 'bold' }} 
              />
            </Grid>
            <Grid item xs={3}>
              <Chip 
                label={`Unique: ${stats.unique}`} 
                size="small" 
                sx={{ width: '100%', bgcolor: '#e8f4fd', color: '#1976d2', fontWeight: 'bold' }} 
              />
            </Grid>
            <Grid item xs={3}>
              <Chip 
                label={`Active: ${stats.unresolved}`} 
                size="small" 
                sx={{ 
                  width: '100%',
                  bgcolor: stats.unresolved > 0 ? '#ffebee' : '#e8f5e8', 
                  color: stats.unresolved > 0 ? '#c62828' : '#2e7d32',
                  fontWeight: 'bold'
                }} 
              />
            </Grid>
            <Grid item xs={3}>
              <Chip 
                label={`Dismissed: ${stats.dismissed}`} 
                size="small" 
                sx={{ width: '100%', bgcolor: '#f5f5f5', color: '#666', fontWeight: 'bold' }} 
              />
            </Grid>
          </Grid>

          {/* Severity Breakdown */}
          <Grid container spacing={0.5}>
            <Grid item xs={3}>
              <Chip 
                label={`Critical: ${stats.criticalCount}`} 
                size="small" 
                sx={{ width: '100%', bgcolor: '#d32f2f', color: 'white', fontSize: '0.7rem' }} 
              />
            </Grid>
            <Grid item xs={3}>
              <Chip 
                label={`High: ${stats.highCount}`} 
                size="small" 
                sx={{ width: '100%', bgcolor: '#f57c00', color: 'white', fontSize: '0.7rem' }} 
              />
            </Grid>
            <Grid item xs={3}>
              <Chip 
                label={`Medium: ${stats.mediumCount}`} 
                size="small" 
                sx={{ width: '100%', bgcolor: '#1976d2', color: 'white', fontSize: '0.7rem' }} 
              />
            </Grid>
            <Grid item xs={3}>
              <Chip 
                label={`Low: ${stats.lowCount}`} 
                size="small" 
                sx={{ width: '100%', bgcolor: '#388e3c', color: 'white', fontSize: '0.7rem' }} 
              />
            </Grid>
          </Grid>

          {/* Action Buttons */}
          {(stats.unresolved > 0 || stats.dismissed > 0) && (
            <Box mt={2} display="flex" gap={1} flexWrap="wrap">
              {stats.unresolved > 0 && (
                <Button
                  size="small"
                  startIcon={<ClearIcon />}
                  onClick={clearErrors}
                  sx={{ textTransform: 'none' }}
                >
                  Clear All
                </Button>
              )}
              {stats.dismissed > 0 && (
                <Button
                  size="small"
                  startIcon={<ShowIcon />}
                  onClick={clearDismissedErrors}
                  sx={{ textTransform: 'none' }}
                >
                  Restore Dismissed
                </Button>
              )}
              <Button
                size="small"
                startIcon={<RefreshIcon />}
                onClick={() => window.location.reload()}
                sx={{ textTransform: 'none' }}
              >
                Refresh Page
              </Button>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Filter Panel */}
      <Collapse in={showFilters}>
        <Card sx={{ mb: 2, bgcolor: '#f8fffe', border: '1px solid #b2dfdb' }}>
          <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
            <Typography variant="subtitle2" fontWeight="bold" gutterBottom sx={{ color: '#00695c' }}>
              🔍 Filters
            </Typography>
            
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth size="small">
                  <InputLabel>Severity</InputLabel>
                  <Select
                    multiple
                    value={filter.severity || []}
                    label="Severity"
                    onChange={(e) => setFilter(prev => ({...prev, severity: e.target.value as any}))}
                  >
                    <MenuItem value="critical">Critical</MenuItem>
                    <MenuItem value="high">High</MenuItem>
                    <MenuItem value="medium">Medium</MenuItem>
                    <MenuItem value="low">Low</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth size="small">
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={filter.resolved !== undefined ? (filter.resolved ? 'resolved' : 'unresolved') : 'all'}
                    label="Status"
                    onChange={(e) => {
                      const value = e.target.value;
                      setFilter(prev => ({
                        ...prev, 
                        resolved: value === 'all' ? undefined : value === 'resolved'
                      }));
                    }}
                  >
                    <MenuItem value="all">All</MenuItem>
                    <MenuItem value="unresolved">Unresolved</MenuItem>
                    <MenuItem value="resolved">Resolved</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12}>
                <Stack direction="row" spacing={1} flexWrap="wrap">
                  <FormControlLabel
                    control={
                      <Switch
                        checked={filter.dismissed === false}
                        onChange={(e) => setFilter(prev => ({
                          ...prev, 
                          dismissed: e.target.checked ? false : undefined
                        }))}
                        size="small"
                      />
                    }
                    label="Hide Dismissed"
                  />
                  <FormControlLabel
                    control={
                      <Switch
                        checked={filter.showOnlyNew || false}
                        onChange={(e) => setFilter(prev => ({
                          ...prev, 
                          showOnlyNew: e.target.checked
                        }))}
                        size="small"
                      />
                    }
                    label="Only New/Unique"
                  />
                </Stack>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Collapse>

      {/* Error List using ErrorDetailsCard */}
      <Box>
        <Typography variant="subtitle2" gutterBottom sx={{ color: '#424242', fontWeight: 'bold' }}>
          Recent Errors ({filteredErrors.length} shown)
        </Typography>
        
        {filteredErrors.length === 0 ? (
          <Card sx={{ bgcolor: '#e8f5e8', border: '1px solid #4caf50' }}>
            <CardContent sx={{ textAlign: 'center', py: 3 }}>
              <CheckIcon sx={{ fontSize: 48, color: '#4caf50', mb: 1 }} />
              <Typography variant="h6" sx={{ color: '#2e7d32', fontWeight: 'bold' }}>
                No errors to display!
              </Typography>
              <Typography variant="body2" sx={{ color: '#4caf50' }}>
                {errors.length === 0 
                  ? 'Your application is running smoothly.' 
                  : 'All errors have been filtered out or dismissed.'
                }
              </Typography>
            </CardContent>
          </Card>
        ) : (
          <Box sx={{ maxHeight: 400, overflow: 'auto' }}>
            {filteredErrors.map((error) => (
              <ErrorDetailsCard
                key={error.id}
                error={error}
                onToggleExpansion={toggleErrorExpansion}
                onCreateTask={handleCreateTaskFromError}
                onDismiss={dismissError}
                onUndismiss={undismissError}
                onDelete={deleteError}
                showTrackButton={true}
              />
            ))}
          </Box>
        )}
      </Box>
    </Box>
  );

  return (
    <>
      {/* Floating OMAI Button with Enhanced Error Badge */}
      {!isOpen && (
        <Badge
          badgeContent={stats.unresolved}
          color="error"
          max={99}
          sx={{
            position: 'fixed',
            top: '50%',
            right: 24,
            transform: 'translateY(-50%)',
            zIndex: 9999,
          }}
        >
          <Fab
            color="primary"
            sx={{
              background: stats.criticalCount > 0 
                ? 'linear-gradient(45deg, #d32f2f 30%, #f44336 90%)'
                : 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
            '&:hover': {
                background: stats.criticalCount > 0
                  ? 'linear-gradient(45deg, #c62828 30%, #d32f2f 90%)'
                  : 'linear-gradient(45deg, #1976D2 30%, #1BA3D3 90%)',
              },
              animation: stats.criticalCount > 0 ? 'pulse 1.5s infinite' : 'none',
              '@keyframes pulse': {
                '0%': {
                  boxShadow: '0 0 0 0 rgba(211, 47, 47, 0.7)',
                },
                '70%': {
                  boxShadow: '0 0 0 10px rgba(211, 47, 47, 0)',
                },
                '100%': {
                  boxShadow: '0 0 0 0 rgba(211, 47, 47, 0)',
                },
              },
          }}
          onClick={() => setIsOpen(true)}
        >
          <AIIcon />
        </Fab>
        </Badge>
      )}

      {/* Enhanced OMAI Assistant Panel */}
      <Collapse in={isOpen}>
        <Paper
          ref={dragRef}
          elevation={8}
          sx={{
            position: 'fixed',
            top: position.y,
            left: position.x,
            width: size.width,
            height: isMinimized ? 'auto' : size.height,
            maxHeight: isMinimized ? 'auto' : size.height,
            zIndex: 9999,
            cursor: isDragging ? 'grabbing' : 'auto',
            background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
            border: '2px solid',
            borderColor: stats.criticalCount > 0 ? '#d32f2f' : 'primary.main',
            borderRadius: 3,
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.15)',
            resize: isResizing ? 'both' : 'none',
            overflow: 'hidden'
          }}
        >
          {/* Enhanced Header with Error Indicators */}
          <Box
            sx={{
              p: 2,
              background: stats.criticalCount > 0 
                ? 'linear-gradient(45deg, #d32f2f 30%, #f44336 90%)'
                : 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
              color: 'white',
              cursor: 'grab',
              '&:active': { cursor: 'grabbing' }
            }}
            onMouseDown={handleDragStart}
          >
            <Box display="flex" justifyContent="space-between" alignItems="center">
              <Box display="flex" alignItems="center" gap={1}>
                <Avatar sx={{ width: 32, height: 32, bgcolor: 'rgba(255,255,255,0.2)' }}>
                  <AIIcon />
                </Avatar>
                <Box>
                  <Typography variant="h6" fontWeight="bold">
                    OMAI Assistant
                    {stats.criticalCount > 0 && (
                      <Chip 
                        label="CRITICAL ERRORS" 
                        size="small" 
                        sx={{ 
                          ml: 1, 
                          bgcolor: 'rgba(255,255,255,0.2)', 
                          color: 'white',
                          fontWeight: 'bold',
                          animation: 'blink 1s infinite',
                          '@keyframes blink': {
                            '0%, 50%': { opacity: 1 },
                            '51%, 100%': { opacity: 0.5 },
                          },
                        }}
                      />
                    )}
                  </Typography>
                  <Typography variant="caption" sx={{ opacity: 0.9 }}>
                    Enhanced Error Console & AI Interface
                  </Typography>
                </Box>
              </Box>
                             <Box display="flex" alignItems="center" gap={1}>
                 <Tooltip title="OMAI Settings">
                   <IconButton
                     size="small"
                     sx={{ color: 'white' }}
                     onClick={() => setShowSettings(!showSettings)}
                   >
                     <SettingsIcon />
                   </IconButton>
                 </Tooltip>
                 <Tooltip title="Command History">
                   <IconButton
                     size="small"
                     sx={{ color: 'white' }}
                     onClick={(e) => setHistoryMenuAnchor(e.currentTarget)}
                   >
                     <HistoryIcon />
                   </IconButton>
                 </Tooltip>
                 <Tooltip title={isMinimized ? "Maximize" : "Minimize"}>
                   <IconButton
                     size="small"
                     sx={{ color: 'white' }}
                     onClick={() => setIsMinimized(!isMinimized)}
                   >
                     {isMinimized ? <MaximizeIcon /> : <MinimizeIcon />}
                   </IconButton>
                 </Tooltip>
                 <DragIcon sx={{ opacity: 0.7 }} />
                 <IconButton
                   size="small"
                   sx={{ color: 'white' }}
                   onClick={() => setIsOpen(false)}
                 >
                   <CloseIcon />
                 </IconButton>
               </Box>
            </Box>
          </Box>

          {/* Content with Enhanced Tabs */}
           {!isMinimized && (
           <Box sx={{ 
             height: size.height - 80, 
              overflow: 'hidden',
              position: 'relative',
              display: 'flex',
              flexDirection: 'column'
            }}>
              {/* Enhanced Tab Navigation */}
              <Tabs 
                value={activeTab} 
                onChange={(e, newValue) => setActiveTab(newValue)}
                sx={{ 
                  borderBottom: 1, 
                  borderColor: 'divider', 
                  flexShrink: 0,
                  bgcolor: '#f8f9fa'
                }}
              >
                <Tab label="Assistant" />
                <Tab 
                  label={
                    <Box display="flex" alignItems="center" gap={1}>
                      <Badge 
                        badgeContent={stats.unresolved} 
                        color="error"
                        max={99}
                      >
                        <Box display="flex" alignItems="center" gap={0.5}>
                          <ErrorIcon sx={{ fontSize: 16 }} />
                          Errors
                        </Box>
                      </Badge>
                      {stats.criticalCount > 0 && (
                        <Chip
                          label="CRITICAL"
                          size="small"
                          sx={{
                            bgcolor: '#d32f2f',
                            color: 'white',
                            fontSize: '0.6rem',
                            height: 16,
                            fontWeight: 'bold'
                          }}
                        />
                      )}
                    </Box>
                  } 
                />
              </Tabs>

              {/* Tab Content */}
              <Box sx={{ p: 2, overflow: 'auto', flexGrow: 1 }}>
                {activeTab === 0 && (
                  <Box>
                    {/* Existing Assistant Tab Content - keeping all the original assistant functionality */}
            {/* Page Context */}
            {pageContext && (
              <Card sx={{ 
                mb: 2, 
                bgcolor: '#e3f2fd', 
                border: '1px solid #bbdefb',
                color: '#0d47a1'
              }}>
                <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                  <Box display="flex" alignItems="center" gap={1} mb={1}>
                    <InfoIcon fontSize="small" sx={{ color: '#1976d2' }} />
                    <Typography variant="subtitle2" fontWeight="bold" sx={{ color: '#0d47a1' }}>
                      Current Context
                    </Typography>
                  </Box>
                  <Typography variant="body2" fontWeight="500" sx={{ color: '#1565c0' }}>
                    {pageContext.componentName}
                  </Typography>
                  <Typography variant="caption" display="block" sx={{ color: '#424242' }}>
                    {pageContext.pathname}
                  </Typography>
                  {pageContext.description && (
                    <Typography variant="caption" display="block" sx={{ mt: 0.5, color: '#666666' }}>
                      {pageContext.description}
                    </Typography>
                  )}
                  <Box display="flex" gap={1} mt={1}>
                    <Chip
                      label={pageContext.userRole}
                      size="small"
                      sx={{ 
                        bgcolor: '#1976d2', 
                        color: 'white',
                        fontWeight: 'bold'
                      }}
                    />
                    {pageContext.dbModel && (
                      <Chip
                        label={`DB: ${pageContext.dbModel}`}
                        size="small"
                        sx={{ 
                          bgcolor: '#e0e0e0', 
                          color: '#424242',
                          fontWeight: 'bold'
                        }}
                      />
                    )}
                  </Box>
                </CardContent>
              </Card>
                         )}

                                        {/* Kanban Debug Panel */}
                    {user?.role === 'super_admin' && kanbanContext && (
                      <Card sx={{ 
                        mb: 2, 
                        bgcolor: '#fff3e0', 
                        border: '1px solid #ffb74d',
                        color: '#e65100'
                      }}>
                        <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                          <Box display="flex" alignItems="center" gap={1} mb={1}>
                            <TaskIcon fontSize="small" sx={{ color: '#f57c00' }} />
                            <Typography variant="subtitle2" fontWeight="bold" sx={{ color: '#e65100' }}>
                              Kanban Status
                            </Typography>
                            <Box ml="auto">
                              <Tooltip title="Refresh Kanban Data">
                                <IconButton
                                  size="small"
                                  onClick={fetchBoards}
                                  sx={{ color: '#f57c00' }}
                                >
                                  <RefreshIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </Box>
                          </Box>
                          <Typography variant="body2" sx={{ color: '#f57c00', mb: 1 }}>
                            <strong>Current Board:</strong> {currentBoard ? `${currentBoard.name} (ID: ${currentBoard.id})` : 'None selected'}
                          </Typography>
                          <Typography variant="body2" sx={{ color: '#f57c00', mb: 1 }}>
                            <strong>Available Boards:</strong> {boards?.length || 0}
                          </Typography>
                          <Typography variant="body2" sx={{ color: '#f57c00', mb: 1 }}>
                            <strong>Available Columns:</strong> {currentBoard?.columns?.length || 0}
                          </Typography>
                          {currentBoard?.columns && Array.isArray(currentBoard.columns) && currentBoard.columns.length > 0 && (
                            <Box>
                              <Typography variant="caption" sx={{ color: '#bf360c', fontWeight: 'bold' }}>
                                Columns: 
                              </Typography>
                              <Box display="flex" gap={0.5} flexWrap="wrap" mt={0.5}>
                                {currentBoard.columns.map((col, index) => (
                                  <Chip
                                    key={col.id}
                                    label={`${col.name} (${col.id})`}
                                    size="small"
                                    sx={{ 
                                      bgcolor: col.name.toLowerCase().includes('bug') || 
                                               col.name.toLowerCase().includes('issue') || 
                                               col.name.toLowerCase().includes('error') 
                                        ? '#f44336' : '#ff9800', 
                                      color: 'white',
                                      fontSize: '0.7rem',
                                      height: 18
                                    }}
                                  />
                                ))}
                              </Box>
                            </Box>
                          )}
                          {!currentBoard && (
                            <Alert severity="warning" sx={{ mt: 1, py: 0 }}>
                              <Typography variant="caption">
                                ⚠️ No Kanban board selected. Visit the Kanban page to select a board for task creation.
                              </Typography>
                              <Box display="flex" gap={1} mt={1}>
                                <Button 
                                  size="small" 
                                  onClick={autoSelectBugsBoard}
                                  sx={{ fontSize: '0.7rem' }}
                                >
                                  Auto-Select Board
                                </Button>
                                <Button 
                                  size="small" 
                                  variant="outlined"
                                  onClick={async () => {
                                    console.log('Testing Kanban API directly...');
                                    try {
                                      const response = await fetch('/api/kanban/health', {
                                        credentials: 'include'
                                      });
                                      console.log('Health check response:', response.status);
                                      if (response.ok) {
                                        const data = await response.json();
                                        console.log('Health check data:', data);
                                        alert(`✅ Kanban API is working! ${data.message}`);
                                      } else {
                                        alert(`❌ Health check failed: ${response.status}`);
                                      }
                                    } catch (error) {
                                      console.error('Health check error:', error);
                                      alert(`❌ Health check error: ${error.message}`);
                                    }
                                  }}
                                  sx={{ fontSize: '0.7rem' }}
                                >
                                  Test API
                                </Button>
                              </Box>
                            </Alert>
                          )}
                        </CardContent>
                      </Card>
                    )}

                          {/* Security Settings */}
             <Box mb={2}>
               <FormControlLabel
                 control={
                   <Switch
                     checked={settings.handsOnModeEnabled}
                     onChange={(e) => {
                       const newValue = e.target.checked;
                       setSettings(prev => ({...prev, handsOnModeEnabled: newValue}));
                       setHandsOnMode(newValue);
                     }}
                     color="warning"
                   />
                 }
                 label={
                   <Box display="flex" alignItems="center" gap={1}>
                     <SecurityIcon fontSize="small" sx={{ color: '#f57c00' }} />
                     <Typography variant="body2" sx={{ color: '#424242', fontWeight: 500 }}>
                       Hands-On Mode
                     </Typography>
                   </Box>
                 }
               />
               {settings.handsOnModeEnabled && settings.destructiveCommandsWarning && (
                 <Alert severity="warning" sx={{ mt: 1, py: 0, bgcolor: '#fff3e0', border: '1px solid #ffb74d' }}>
                   <Typography variant="caption" sx={{ color: '#e65100', fontWeight: 500 }}>
                     Destructive commands enabled. Use with caution.
                   </Typography>
                 </Alert>
               )}
             </Box>

            {/* Command Input */}
            <form onSubmit={handleCommandSubmit}>
              <TextField
                ref={commandInputRef}
                fullWidth
                size="small"
                placeholder="Enter OMAI command..."
                value={command}
                onChange={(e) => setCommand(e.target.value)}
                disabled={isExecuting}
                InputProps={{
                  startAdornment: <TerminalIcon sx={{ mr: 1, color: '#1976d2' }} />,
                  endAdornment: (
                    <IconButton
                      type="submit"
                      size="small"
                      disabled={!command.trim() || isExecuting}
                      sx={{ color: '#1976d2' }}
                    >
                      {isExecuting ? <CircularProgress size={16} /> : <SendIcon />}
                    </IconButton>
                  )
                }}
                sx={{ 
                  mb: 2,
                  '& .MuiOutlinedInput-root': {
                    bgcolor: 'white',
                    '& fieldset': {
                      borderColor: '#e0e0e0'
                    },
                    '&:hover fieldset': {
                      borderColor: '#1976d2'
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: '#1976d2'
                    }
                  },
                  '& .MuiInputBase-input': {
                    color: '#424242',
                    fontWeight: 500
                  }
                }}
              />
            </form>

            {/* Quick Suggestions */}
            {suggestions.length > 0 && (
              <Box mb={2}>
                <Typography variant="subtitle2" gutterBottom sx={{ color: '#424242', fontWeight: 'bold' }}>
                  Quick Actions
                </Typography>
                <Box display="flex" flexWrap="wrap" gap={0.5}>
                  {suggestions.map((suggestion, index) => (
                    <Chip
                      key={index}
                      label={suggestion}
                      size="small"
                      onClick={() => handleSuggestionClick(suggestion)}
                      sx={{ 
                        cursor: 'pointer',
                        bgcolor: '#f5f5f5',
                        color: '#424242',
                        fontWeight: 500,
                        '&:hover': {
                          bgcolor: '#e3f2fd',
                          color: '#1976d2'
                        }
                      }}
                    />
                  ))}
                </Box>
              </Box>
            )}

            {/* Command Results */}
            {commandHistory.length > 0 && (
              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ color: '#424242', fontWeight: 'bold' }}>
                  Recent Commands
                </Typography>
                <List dense sx={{ maxHeight: 200, overflow: 'auto' }}>
                  {commandHistory.slice(0, 5).map((cmd, index) => (
                    <ListItem key={cmd.id} sx={{ px: 0, bgcolor: index % 2 === 0 ? '#f9f9f9' : 'transparent', borderRadius: 1 }}>
                      <ListItemIcon sx={{ minWidth: 32 }}>
                        {cmd.status === 'pending' && <CircularProgress size={16} />}
                        {cmd.status === 'success' && <Chip label="✓" size="small" sx={{ bgcolor: '#4caf50', color: 'white', fontWeight: 'bold' }} />}
                        {cmd.status === 'error' && <Chip label="✗" size="small" sx={{ bgcolor: '#f44336', color: 'white', fontWeight: 'bold' }} />}
                      </ListItemIcon>
                      <ListItemText
                        primary={cmd.command}
                        secondary={cmd.result}
                        primaryTypographyProps={{ 
                          variant: 'body2', 
                          fontFamily: 'monospace',
                          color: '#424242',
                          fontWeight: 500
                        }}
                        secondaryTypographyProps={{ 
                          variant: 'caption',
                          color: '#666666'
                        }}
                      />
                    </ListItem>
                  ))}
                </List>
                      </Box>
                    )}
              </Box>
                         )}

                {activeTab === 1 && renderErrorsTab()}
              </Box>
             
             {/* Resize Handle */}
             <Box
               sx={{
                 position: 'absolute',
                 bottom: 0,
                 right: 0,
                 width: 20,
                 height: 20,
                 cursor: 'nw-resize',
                 background: 'linear-gradient(135deg, #1976d2 0%, #42a5f5 100%)',
                 borderTopLeftRadius: 8,
                 display: 'flex',
                 alignItems: 'center',
                 justifyContent: 'center',
                 '&:hover': {
                   background: 'linear-gradient(135deg, #1565c0 0%, #2196f3 100%)',
                 }
               }}
               onMouseDown={handleResizeStart}
             >
               <ResizeIcon sx={{ fontSize: 12, color: 'white' }} />
             </Box>
           </Box>
           )}
         </Paper>
      </Collapse>

      {/* History Menu - keeping existing functionality */}
      <Menu
        anchorEl={historyMenuAnchor}
        open={Boolean(historyMenuAnchor)}
        onClose={() => setHistoryMenuAnchor(null)}
      >
        {commandHistory.slice(0, 10).map((cmd) => (
          <MenuItem
            key={cmd.id}
            onClick={() => handleHistoryCommand(cmd)}
            sx={{ fontFamily: 'monospace', fontSize: '0.875rem' }}
          >
            {cmd.command}
          </MenuItem>
        ))}
        {commandHistory.length === 0 && (
          <MenuItem disabled>No command history</MenuItem>
        )}
      </Menu>

      {/* Enhanced Task Creation Dialog */}
      <Dialog 
        open={taskCreationDialog} 
        onClose={() => setTaskCreationDialog(false)} 
        maxWidth="md" 
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <TaskIcon sx={{ color: '#1976d2' }} />
            📌 Create Bug Task from Error
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedError && (
            <Box>
              {/* Enhanced Error Summary */}
              <Card sx={{ mb: 2, bgcolor: '#fff3e0', border: '1px solid #ffb74d' }}>
                <CardContent sx={{ p: 2 }}>
                  <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                    🐛 Error Details
                  </Typography>
                  <Typography variant="body2" gutterBottom>
                    <strong>Hash:</strong> {selectedError.hash}
                  </Typography>
                  <Typography variant="body2" gutterBottom>
                    <strong>Message:</strong> {selectedError.message}
                  </Typography>
                  <Typography variant="body2" gutterBottom>
                    <strong>Component:</strong> {selectedError.component}
                  </Typography>
                  <Typography variant="body2" gutterBottom>
                    <strong>Severity:</strong> {selectedError.severity} | <strong>Occurrences:</strong> {selectedError.occurrenceCount}
                  </Typography>
                  <Typography variant="body2">
                    <strong>First/Last:</strong> {new Date(selectedError.firstOccurrence).toLocaleString()} / {new Date(selectedError.lastOccurrence).toLocaleString()}
                  </Typography>
                </CardContent>
              </Card>

              {/* Task Form */}
              <Stack spacing={2}>
                <TextField
                  fullWidth
                  label="Task Title"
                  value={taskForm.title}
                  onChange={(e) => setTaskForm(prev => ({...prev, title: e.target.value}))}
                  placeholder="🐛 Fix: Error description..."
                />
                <TextField
                  fullWidth
                  multiline
                  rows={8}
                  label="Task Description (Markdown)"
                  value={taskForm.description}
                  onChange={(e) => setTaskForm(prev => ({...prev, description: e.target.value}))}
                  placeholder="Bug report will be auto-generated..."
                />
                <FormControl fullWidth>
                  <InputLabel>Priority</InputLabel>
                  <Select
                    value={taskForm.priority}
                    label="Priority"
                    onChange={(e) => setTaskForm(prev => ({...prev, priority: e.target.value as any}))}
                  >
                    <MenuItem value="low">Low</MenuItem>
                    <MenuItem value="medium">Medium</MenuItem>
                    <MenuItem value="high">High</MenuItem>
                    <MenuItem value="urgent">Urgent</MenuItem>
                  </Select>
                </FormControl>
                
                <Alert severity="info">
                  Task will be created in the Bugs column (or first available column) with appropriate labels and priority based on error severity.
                </Alert>
              </Stack>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTaskCreationDialog(false)}>
            Cancel
          </Button>
          <Button 
            onClick={() => handleCreateTaskFromError()} 
            variant="contained"
            disabled={!taskForm.title.trim()}
            startIcon={<TaskIcon />}
          >
            📌 Create Bug Task
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default GlobalOMAI; 