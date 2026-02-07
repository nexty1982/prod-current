import { CustomizerContext } from '@/context/CustomizerContext';
import {
    Box,
    Button,
    Chip,
    CircularProgress,
    Collapse,
    IconButton,
    Paper,
    TextField,
    Tooltip
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import {
    AlertCircle,
    Archive,
    Check,
    Eye,
    FileSearch,
    FolderOpen,
    History,
    RefreshCw,
    Settings
} from 'lucide-react';
import React, { useCallback, useContext, useEffect, useState } from 'react';
import { toast } from 'react-toastify';

import SessionPulse from '@/features/admin/components/SessionPulse';
import {
    FileAnalysis,
    Phase1Report,
    PreviewRestoreResponse,
    SortOption
} from '@/types/refactorConsole';
import refactorConsoleClient, { DEFAULT_PATH_CONFIG, PathConfig } from './api/refactorConsoleClient';
import DiffViewModal from './components/DiffViewModal';
import Legend from './components/Legend';
import RequirementPreviewModal from './components/RequirementPreviewModal';
import RestoreBundleButton from './components/RestoreBundleButton';
import RestoreHistoryViewer from './components/RestoreHistoryViewer';
import Toolbar from './components/Toolbar';
import Tree from './components/Tree';
import { useRefactorScan } from './hooks/useRefactorScan';
import { useWhitelist } from './hooks/useWhitelist';

const RefactorConsole: React.FC = () => {
  // Get theme context for dark mode
  const { activeMode } = useContext(CustomizerContext);
  // Get MUI theme for background colors
  const theme = useTheme();
  
  // Diagnostic logging (dev only)
  useEffect(() => {
    if (import.meta.env.DEV) {
      console.log('[RefactorConsole Theme]', {
        activeMode,
        paletteMode: theme.palette.mode,
        backgroundDefault: theme.palette.background.default,
        backgroundPaper: theme.palette.background.paper,
        hasDarkClass: document.documentElement.classList.contains('dark'),
      });
    }
  }, [activeMode, theme.palette.mode]);
  
  const {
    isWhitelisted,
    toggleWhitelist,
    clearWhitelist,
    whitelistCount,
  } = useWhitelist();

  const {
    scanData,
    isLoading,
    error,
    filterState,
    setFilterState,
    sortOption,
    setSortOption,
    treeItems,
    expandedPaths,
    setExpandedPaths,
    loadScanData,
    refreshScan,
    toggleExpanded,
    expandAll,
    collapseAll,
    filteredCount,
    visibleNodes,
    compareWithBackup,
    setCompareWithBackup,
    phase1Report: hookPhase1Report,
    bundles,
    calculateBundle
  } = useRefactorScan(isWhitelisted);

  // Note: Dark mode is handled by the app's theme provider, not by this component
  // MUI uses theme.palette.mode, Tailwind uses the 'dark' class on documentElement
  // Both should be managed at the app level (CustomizerContext/ThemeProvider)

  const [showModal, setShowModal] = useState<{ 
    type: 'reasons' | 'duplicates' | 'requirementPreview'; 
    data: any 
  } | null>(null);
  
  // Phase 1 state management
  type Phase1State = 'idle' | 'starting' | 'running' | 'done' | 'error';
  const [phase1State, setPhase1State] = useState<Phase1State>('idle');
  const [phase1Report, setPhase1Report] = useState<Phase1Report | null>(hookPhase1Report);
  const [phase1Progress, setPhase1Progress] = useState(0);
  const [phase1CurrentStep, setPhase1CurrentStep] = useState<string>('');
  const [phase1Error, setPhase1Error] = useState<string | null>(null);
  const [phase1JobId, setPhase1JobId] = useState<string | null>(null);
  const [healthStatus, setHealthStatus] = useState<'checking' | 'ok' | 'error'>('checking');
  const [healthError, setHealthError] = useState<string | null>(null);
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null);
  
  // ========================================================================
  // Path Configuration State
  // ========================================================================
  const [showPathConfig, setShowPathConfig] = useState(false);
  const [pathConfig, setPathConfig] = useState<PathConfig>(() => refactorConsoleClient.getSavedPaths());
  const [pathValidation, setPathValidation] = useState<{
    sourcePath?: { isValid: boolean; exists: boolean; error?: string };
    destinationPath?: { isValid: boolean; exists: boolean; error?: string };
    backupPath?: { isValid: boolean; exists: boolean; error?: string };
  }>({});
  const [isValidatingPaths, setIsValidatingPaths] = useState(false);
  
  // ========================================================================
  // Multi-Source & Snapshot State
  // ========================================================================
  const [sourceType, setSourceType] = useState<'local' | 'remote'>('local');
  const [selectedSnapshot, setSelectedSnapshot] = useState<string | null>(null);
  const [availableSnapshots, setAvailableSnapshots] = useState<any[]>([]);
  const [isLoadingSnapshots, setIsLoadingSnapshots] = useState(false);
  const [snapshotError, setSnapshotError] = useState<string | null>(null);
  
  // ========================================================================
  // Diff Preview & Restore State
  // ========================================================================
  const [showDiffModal, setShowDiffModal] = useState(false);
  const [previewData, setPreviewData] = useState<PreviewRestoreResponse | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [pendingRestorePath, setPendingRestorePath] = useState<string | null>(null);
  
  // ========================================================================
  // Restore History State
  // ========================================================================
  const [showHistoryViewer, setShowHistoryViewer] = useState(false);
  
  // Validate paths on the server
  const validatePaths = useCallback(async (config: PathConfig) => {
    setIsValidatingPaths(true);
    try {
      const result = await refactorConsoleClient.validatePaths(config);
      setPathValidation({
        sourcePath: result.validations.sourcePath,
        destinationPath: result.validations.destinationPath,
        backupPath: result.validations.backupPath
      });
      return result.ok;
    } catch (error) {
      console.error('Path validation error:', error);
      toast.error('Failed to validate paths');
      return false;
    } finally {
      setIsValidatingPaths(false);
    }
  }, []);
  
  // Save path configuration
  const handleSavePaths = useCallback(async () => {
    const isValid = await validatePaths(pathConfig);
    if (isValid) {
      refactorConsoleClient.savePaths(pathConfig);
      toast.success('Path configuration saved');
      setShowPathConfig(false);
    } else {
      toast.warning('Some paths are invalid. Please check the validation messages.');
    }
  }, [pathConfig, validatePaths]);
  
  // Reset paths to defaults
  const handleResetPaths = useCallback(() => {
    setPathConfig({ ...DEFAULT_PATH_CONFIG });
    setPathValidation({});
    refactorConsoleClient.clearSavedPaths();
    toast.info('Paths reset to defaults');
  }, []);
  
  // Sync phase1Report from hook
  useEffect(() => {
    if (hookPhase1Report) {
      setPhase1Report(hookPhase1Report);
    }
  }, [hookPhase1Report]);

  // Health check on component mount
  useEffect(() => {
    const verifyConnection = async () => {
      try {
        setHealthStatus('checking');
        setHealthError(null);
        const health = await refactorConsoleClient.healthCheck();
        if (health.ok || health.status === 'ok') {
          setHealthStatus('ok');
        } else {
          setHealthStatus('error');
          setHealthError(health.message || 'Unknown error');
        }
      } catch (error) {
        setHealthStatus('error');
        setHealthError(error instanceof Error ? error.message : 'Connection failed');
        console.error('Health check failed:', error);
        
        // Autonomous fix: If it's a TypeError (500), suggest rebuild
        if (error instanceof Error && error.message.includes('TypeError')) {
          console.warn('[RefactorConsole] Health check failed with TypeError. Server may need rebuild.');
          toast.error('API connection error detected. Server may need rebuild.', {
            autoClose: 5000
          });
        }
      }
    };

    verifyConnection();
  }, []);

  // Initialize sourceType and snapshotId from saved config on mount
  useEffect(() => {
    const savedConfig = refactorConsoleClient.getSavedPaths();
    if (savedConfig.sourceType) {
      setSourceType(savedConfig.sourceType);
    }
    if (savedConfig.snapshotId) {
      setSelectedSnapshot(savedConfig.snapshotId);
    }
  }, []);

  // Load available snapshots when sourceType changes
  useEffect(() => {
    const loadSnapshots = async () => {
      setIsLoadingSnapshots(true);
      setSnapshotError(null);
      try {
        const result = await refactorConsoleClient.fetchSnapshots(sourceType);
        setAvailableSnapshots(result.snapshots);
        
        // Auto-select most recent snapshot if available and no snapshot is currently selected
        if (result.defaultSnapshot && !selectedSnapshot) {
          setSelectedSnapshot(result.defaultSnapshot.id);
          toast.info(`Auto-selected most recent snapshot: ${result.defaultSnapshot.label}`);
        }
      } catch (error) {
        console.error('Failed to load snapshots:', error);
        setSnapshotError(error instanceof Error ? error.message : 'Failed to load snapshots');
        setAvailableSnapshots([]);
        
        // If it's a Samba mount error for remote, show warning
        if (sourceType === 'remote' && error instanceof Error && error.message.includes('mount')) {
          toast.warning('Remote Samba share is not mounted. Please ensure /mnt/refactor-remote is accessible.');
        }
      } finally {
        setIsLoadingSnapshots(false);
      }
    };

    loadSnapshots();
  }, [sourceType]);

  // Sort options configuration
  const sortOptions: SortOption[] = [
    { key: 'score', direction: 'desc', label: 'Usage Score (High to Low)' },
    { key: 'score', direction: 'asc', label: 'Usage Score (Low to High)' },
    { key: 'name', direction: 'asc', label: 'File Name (A-Z)' },
    { key: 'name', direction: 'desc', label: 'File Name (Z-A)' },
    { key: 'mtime', direction: 'desc', label: 'Recently Modified' },
    { key: 'mtime', direction: 'asc', label: 'Oldest Modified' },
    { key: 'classification', direction: 'asc', label: 'Classification Priority' },
    ...(compareWithBackup ? [
      { key: 'recoveryStatus', direction: 'asc', label: 'Recovery Status (Missing First)' },
      { key: 'recoveryStatus', direction: 'desc', label: 'Recovery Status (New First)' },
    ] : []),
  ];

  // Handle toolbar actions
  const handleSearchChange = (query: string) => {
    setFilterState(prev => ({ ...prev, searchQuery: query }));
  };

  const handleFilterChange = (updates: Partial<typeof filterState>) => {
    setFilterState(prev => ({ ...prev, ...updates }));
  };

  const handleSortChange = (sort: SortOption) => {
    setSortOption(sort);
  };

  const handleRefresh = async () => {
    try {
      // Save sourceType and snapshotId to pathConfig for persistence
      const updatedPathConfig = {
        ...pathConfig,
        sourceType,
        snapshotId: selectedSnapshot || undefined
      };
      refactorConsoleClient.savePaths(updatedPathConfig);
      
      // Call loadScanData directly with sourceType and snapshotId
      await loadScanData(true, compareWithBackup, sourceType, selectedSnapshot || undefined);
      toast.success('Scan data refreshed');
    } catch (error) {
      toast.error('Failed to refresh scan data');
    }
  };

  const handleToggleRecoveryMode = () => {
    setCompareWithBackup(!compareWithBackup);
    toast.info(`Recovery Mode ${!compareWithBackup ? 'enabled' : 'disabled'}`);
  };

  const handleAnalyze = async () => {
    try {
      await refreshScan(); // This will trigger a rebuild
      toast.success('Codebase analysis completed');
    } catch (error) {
      toast.error('Failed to analyze codebase');
    }
  };

  const handlePhase1Analysis = async () => {
    // Clear any existing polling interval
    if (pollingInterval) {
      clearInterval(pollingInterval);
      setPollingInterval(null);
    }

    // Reset state
    setPhase1State('starting');
    setPhase1Progress(0);
    setPhase1CurrentStep('Starting analysis...');
    setPhase1Error(null);
    setPhase1Report(null); // Clear previous report
    setPhase1JobId(null);
    
    try {
      // Start the background job
      const startResponse = await refactorConsoleClient.startPhase1Analysis();
      const jobId = startResponse.jobId;
      
      if (!jobId) {
        throw new Error('No jobId returned from server');
      }
      
      setPhase1JobId(jobId);
      setPhase1State('running');
      toast.info('Phase 1 analysis started in background');
      
      // Start polling for status
      let pollAttempts = 0;
      const MAX_POLL_ATTEMPTS = 600; // 20 minutes max (600 * 2 seconds)
      
      const interval = setInterval(async () => {
        pollAttempts++;
        
        // Safety: Stop polling after max attempts
        if (pollAttempts > MAX_POLL_ATTEMPTS) {
          clearInterval(interval);
          setPollingInterval(null);
          setPhase1State('error');
          setPhase1Error('Polling timeout: Analysis took too long');
          setPhase1JobId(null);
          toast.error('Phase 1 analysis timed out');
          console.error('[Phase1] Polling timeout after', MAX_POLL_ATTEMPTS, 'attempts');
          return;
        }
        
        try {
          const status = await refactorConsoleClient.getPhase1JobStatus(jobId);
          
          // Validate status response structure
          if (!status || typeof status !== 'object') {
            console.warn('[Phase1] Invalid status response format, continuing to poll...');
            return;
          }
          
          // Update progress and current step (always safe to update these)
          setPhase1Progress(status.progress ?? 0);
          setPhase1CurrentStep(status.currentStep || 'Processing...');
          
          // Only proceed if status is explicitly 'done' (not just progress 100%)
          if (status.status === 'done') {
            // Double-check: ensure progress is 100% before fetching results
            if (status.progress !== undefined && status.progress < 100) {
              console.log(`[Phase1] Status is 'done' but progress is ${status.progress}%, continuing to poll...`);
              return;
            }
            
            // Analysis complete - fetch result
            try {
              clearInterval(interval);
              setPollingInterval(null);
              
              const result = await refactorConsoleClient.getPhase1JobResult(jobId);
              
              // Validate result structure before setting state
              if (!result || typeof result !== 'object') {
                throw new Error('Invalid result format: result is not an object');
              }
              
              // Ensure required fields exist with defaults
              const validatedResult: Phase1Report = {
                generatedAt: result.generatedAt || new Date().toISOString(),
                sourcePath: result.sourcePath || '',
                targetPath: result.targetPath || '',
                summary: {
                  totalFilesInSource: result.summary?.totalFilesInSource ?? 0,
                  missingInTarget: result.summary?.missingInTarget ?? 0,
                  modifiedInTarget: result.summary?.modifiedInTarget ?? 0,
                  identical: result.summary?.identical ?? 0,
                  existsOnlyInTarget: result.summary?.existsOnlyInTarget ?? 0
                },
                restorableFiles: Array.isArray(result.restorableFiles) ? result.restorableFiles : [],
                modifiedFiles: Array.isArray(result.modifiedFiles) ? result.modifiedFiles : [],
                documentation: {
                  endpointsFound: result.documentation?.endpointsFound ?? 0,
                  endpointsVerified: result.documentation?.endpointsVerified ?? 0,
                  endpointsMissing: result.documentation?.endpointsMissing ?? 0
                },
                files: Array.isArray(result.files) ? result.files : [],
                integrationPoints: {
                  menuItems: result.integrationPoints?.menuItems || null,
                  router: result.integrationPoints?.router || null
                }
              };
              
              // Final validation: ensure summary exists before setting state
              if (!validatedResult.summary) {
                throw new Error('Result validation failed: summary is missing');
              }
              
              // Only set state if validation passes
              // Ensure progress is set to 100% when marking as done
              setPhase1Progress(100);
              setPhase1CurrentStep('Complete');
              setPhase1State('done');
              setPhase1Report(validatedResult);
              setPhase1JobId(null);
              toast.success(`Phase 1 analysis complete: ${validatedResult.summary.missingInTarget} restorable files found`);
            } catch (resultError) {
              // If result fetch fails, check if it's just not ready yet
              if (resultError instanceof Error && resultError.message.includes('not ready')) {
                // Continue polling - don't clear interval
                console.log('[Phase1] Result not ready yet, continuing to poll...');
                return;
              }
              // Otherwise, show error
              clearInterval(interval);
              setPollingInterval(null);
              setPhase1State('error');
              setPhase1Error(resultError instanceof Error ? resultError.message : 'Failed to fetch results');
              setPhase1JobId(null);
              toast.error(`Failed to fetch Phase 1 results: ${resultError instanceof Error ? resultError.message : 'Unknown error'}`);
              console.error('Phase 1 result fetch error:', resultError);
            }
          } else if (status.status === 'error') {
            // Analysis failed
            clearInterval(interval);
            setPollingInterval(null);
            setPhase1State('error');
            setPhase1Error(status.error || 'Unknown error');
            setPhase1JobId(null);
            toast.error(`Phase 1 analysis failed: ${status.error || 'Unknown error'}`);
            console.error('Phase 1 error:', status.error);
          }
          // If status is 'running' or 'queued', continue polling (no action needed)
        } catch (error) {
          console.error(`[Phase1] Error polling status (attempt ${pollAttempts}):`, error);
          // Don't stop polling on transient errors, but log them
          if (error instanceof Error && !error.message.includes('not ready') && !error.message.includes('Failed to fetch')) {
            console.warn('[Phase1] Non-transient error during polling, will retry:', error.message);
          }
          // Continue polling on errors - network issues are transient
        }
      }, 2000); // Poll every 2 seconds
      
      setPollingInterval(interval);
    } catch (error) {
      setPhase1State('error');
      setPhase1Error(error instanceof Error ? error.message : 'Failed to start Phase 1 analysis');
      setPhase1JobId(null);
      toast.error(error instanceof Error ? error.message : 'Failed to start Phase 1 analysis');
      console.error('Phase 1 start error:', error);
    }
  };

  // Cleanup polling interval on unmount
  useEffect(() => {
    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    };
  }, [pollingInterval]);

  const handleShowRequirementPreview = (fileAnalysis: FileAnalysis) => {
    // Only allow preview when Phase 1 is done and report is validated
    if (phase1State !== 'done' || !phase1Report || !phase1Report.summary) {
      toast.warning('Phase 1 analysis must be completed before viewing requirements');
      return;
    }
    setShowModal({
      type: 'requirementPreview',
      data: {
        fileAnalysis,
        integrationPoints: phase1Report.integrationPoints ?? { menuItems: null, router: null }
      }
    });
  };

  // Handle tree actions
  const handleNodeAction = async (action: string, node: any) => {
    switch (action) {
      case 'copy':
        navigator.clipboard.writeText(node.relPath);
        toast.success('Path copied to clipboard');
        break;
        
      case 'open':
        // In a real implementation, this would integrate with VS Code or similar
        toast.info(`Would open ${node.relPath} in editor`);
        break;
        
      case 'restore':
        // Guard: prevent restoring whitelisted files without explicit confirmation
        if (isWhitelisted(node.relPath)) {
          const confirmed = window.confirm(
            `"${node.relPath}" is whitelisted (protected).\n\nRestoring will overwrite this protected file. Continue?`
          );
          if (!confirmed) {
            toast.info('Restore cancelled — file is protected by whitelist');
            break;
          }
        }
        // Show preview/diff modal before restoring
        if (node.recoveryStatus === 'missing_in_prod' && node.backupPath) {
          handlePreviewRestore(node.relPath);
        }
        break;
        
      case 'reasons':
        setShowModal({ 
          type: 'reasons', 
          data: { 
            node, 
            reasons: node.reasons,
            classification: node.classification,
            usage: node.usage
          } 
        });
        break;
        
      case 'duplicates':
        if (node.similarity?.duplicates.length || node.similarity?.nearMatches.length) {
          setShowModal({ 
            type: 'replicates', 
            data: { 
              node, 
              duplicates: node.similarity?.duplicates || [],
              nearMatches: node.similarity?.nearMatches || []
            } 
          });
        }
        break;
        
      default:
        console.log('Unknown action:', action);
    }
  };

  const handleToggleExpanded = (path: string) => {
    toggleExpanded(path);
  };

  // Handle preview restore (dry run with diff)
  const handlePreviewRestore = async (relPath: string) => {
    setIsLoadingPreview(true);
    setPendingRestorePath(relPath);
    
    try {
      const preview = await refactorConsoleClient.previewRestore(
        relPath,
        undefined,
        sourceType,
        selectedSnapshot || undefined
      );
      
      setPreviewData(preview);
      setShowDiffModal(true);
    } catch (error) {
      console.error('Preview failed:', error);
      toast.error(`Failed to preview file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoadingPreview(false);
    }
  };

  // Handle confirmed restore after preview
  const handleConfirmRestore = async () => {
    if (!pendingRestorePath) return;

    // Double-check whitelist guard at restore time
    if (isWhitelisted(pendingRestorePath)) {
      const confirmed = window.confirm(
        `"${pendingRestorePath}" is whitelisted (protected).\n\nAre you sure you want to overwrite this protected file?`
      );
      if (!confirmed) {
        toast.info('Restore cancelled — file is protected by whitelist');
        return;
      }
    }

    setIsRestoring(true);
    
    try {
      await refactorConsoleClient.restore(
        pendingRestorePath,
        undefined,
        sourceType,
        selectedSnapshot || undefined
      );
      
      toast.success(`File restored: ${pendingRestorePath}`);
      
      // Close modal
      setShowDiffModal(false);
      setPreviewData(null);
      setPendingRestorePath(null);
      
      // Refresh scan to update status
      await loadScanData(true, compareWithBackup, sourceType, selectedSnapshot || undefined);
    } catch (error) {
      console.error('Restore failed:', error);
      toast.error(`Failed to restore file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsRestoring(false);
    }
  };

  // Handle cancel diff modal
  const handleCancelDiff = () => {
    setShowDiffModal(false);
    setPreviewData(null);
    setPendingRestorePath(null);
  };

  // Modal component for showing details
  const Modal = ({ onClose }: { onClose: () => void }) => {
    if (!showModal || showModal.type === 'requirementPreview') return null;

    const { type, data } = showModal;

    return (
      <Box
        sx={{
          position: 'fixed',
          inset: 0,
          bgcolor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1300
        }}
      >
        <Paper
          elevation={8}
          sx={{
            bgcolor: 'background.paper',
            borderRadius: 1,
            maxWidth: '42rem',
            width: '100%',
            mx: 2,
            maxHeight: '80vh',
            overflow: 'auto'
          }}
        >
          <Box sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: theme.palette.text.primary }}>
                {type === 'reasons' ? 'Classification Details' : 'Duplicate Analysis'}
              </h2>
              <button
                onClick={onClose}
                style={{
                  background: 'none',
                  border: 'none',
                  color: theme.palette.text.secondary,
                  cursor: 'pointer',
                  fontSize: '1.5rem',
                  lineHeight: 1,
                  padding: 0,
                  width: 24,
                  height: 24
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = theme.palette.text.primary;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = theme.palette.text.secondary;
                }}
              >
                ×
              </button>
            </Box>

            {type === 'reasons' && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <div>
                  <h3 style={{ fontWeight: 500, color: theme.palette.text.primary, marginBottom: '0.5rem' }}>File Information</h3>
                  <Box sx={{ bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : theme.palette.grey[50], p: 1.5, borderRadius: 1 }}>
                    <p style={{ fontSize: '0.875rem', fontFamily: 'monospace', color: theme.palette.text.primary }}>{data.node.relPath}</p>
                    <p style={{ fontSize: '0.875rem', color: theme.palette.text.secondary, marginTop: '0.25rem' }}>
                      Classification: <span style={{ fontWeight: 500 }}>{data.classification}</span>
                    </p>
                  </Box>
                </div>

                <div>
                  <h3 style={{ fontWeight: 500, color: theme.palette.text.primary, marginBottom: '0.5rem' }}>Usage Statistics</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <Box sx={{ bgcolor: alpha(theme.palette.info.main, 0.1), p: 1.5, borderRadius: 1 }}>
                      <p style={{ fontSize: '0.875rem', color: theme.palette.info.main }}>Import References</p>
                      <p style={{ fontSize: '1.125rem', fontWeight: 600, color: theme.palette.info.main }}>{data.usage.importRefs}</p>
                    </Box>
                    <Box sx={{ bgcolor: alpha(theme.palette.success.main, 0.1), p: 1.5, borderRadius: 1 }}>
                      <p style={{ fontSize: '0.875rem', color: theme.palette.success.main }}>Server References</p>
                      <p style={{ fontSize: '1.125rem', fontWeight: 600, color: theme.palette.success.main }}>{data.usage.serverRefs}</p>
                    </Box>
                    <Box sx={{ bgcolor: alpha(theme.palette.secondary.main, 0.1), p: 1.5, borderRadius: 1 }}>
                      <p style={{ fontSize: '0.875rem', color: theme.palette.secondary.main }}>Route References</p>
                      <p style={{ fontSize: '1.125rem', fontWeight: 600, color: theme.palette.secondary.main }}>{data.usage.routeRefs}</p>
                    </Box>
                    <Box sx={{ bgcolor: alpha(theme.palette.warning.main, 0.1), p: 1.5, borderRadius: 1 }}>
                      <p style={{ fontSize: '0.875rem', color: theme.palette.warning.main }}>Usage Score</p>
                      <p style={{ fontSize: '1.125rem', fontWeight: 600, color: theme.palette.warning.main }}>{data.usage.score}</p>
                    </Box>
                  </div>
                </div>

                <div>
                  <h3 style={{ fontWeight: 500, color: theme.palette.text.primary, marginBottom: '0.5rem' }}>Classification Reasons</h3>
                  <ul className="space-y-1">
                    {data.reasons.map((reason: string, index: number) => (
                      <li key={index} className="flex items-start gap-2 text-sm" style={{ color: theme.palette.text.primary }}>
                        <span style={{ color: theme.palette.info.main, marginTop: '0.125rem' }}>•</span>
                        <span>{reason}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </Box>
            )}

            {type === 'duplicates' && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <div>
                  <h3 style={{ fontWeight: 500, color: theme.palette.text.primary, marginBottom: '0.5rem' }}>Duplicate Analysis</h3>
                  <Box sx={{ bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : theme.palette.grey[50], p: 1.5, borderRadius: 1 }}>
                    <p style={{ fontSize: '0.875rem', fontFamily: 'monospace', color: theme.palette.text.primary }}>{data.node.relPath}</p>
                  </Box>
                </div>

                {data.duplicates.length > 0 && (
                  <div>
                    <h3 style={{ fontWeight: 500, color: theme.palette.text.primary, marginBottom: '0.5rem' }}>Exact Duplicates</h3>
                    <ul className="space-y-1">
                      {data.duplicates.map((duplicate: string, index: number) => (
                        <li key={index} className="flex items-start gap-2 text-sm" style={{ color: theme.palette.text.primary }}>
                          <span style={{ color: theme.palette.error.main, marginTop: '0.125rem' }}>•</span>
                          <span className="font-mono">{duplicate}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {data.nearMatches.length > 0 && (
                  <div>
                    <h3 style={{ fontWeight: 500, color: theme.palette.text.primary, marginBottom: '0.5rem' }}>Near Matches</h3>
                    <ul className="space-y-2">
                      {data.nearMatches.map((match: any, index: number) => (
                        <li key={index}>
                          <Box sx={{ 
                            bgcolor: theme.palette.mode === 'dark' ? theme.palette.warning.dark + '20' : theme.palette.warning.light,
                            p: 1.5,
                            borderRadius: 1,
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'flex-start'
                          }}>
                            <span className="font-mono text-sm" style={{ color: theme.palette.text.primary }}>{match.target}</span>
                            <Box sx={{
                              fontSize: '0.75rem',
                              bgcolor: theme.palette.mode === 'dark' ? theme.palette.warning.dark + '40' : theme.palette.warning.main,
                              color: theme.palette.mode === 'dark' ? theme.palette.warning.light : theme.palette.warning.contrastText,
                              px: 1,
                              py: 0.5,
                              borderRadius: 0.5
                            }}>
                              {Math.round(match.similarity * 100)}% similar
                            </Box>
                          </Box>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </Box>
            )}
          </Box>

          <Box sx={{ px: 3, py: 2, borderTop: 1, borderColor: 'divider', bgcolor: 'action.hover' }}>
            <Button
              variant="outlined"
              onClick={onClose}
              sx={{ textTransform: 'none' }}
            >
              Close
            </Button>
          </Box>
        </Paper>
      </Box>
    );
  };

  return (
    <Box 
      sx={{ 
        minHeight: '100vh',
        bgcolor: 'background.default',
        color: 'text.primary'
      }}
      className="min-h-screen"
    >
      {/* Header */}
      <Box 
        sx={{ 
          bgcolor: 'background.paper',
          borderBottom: 1,
          borderColor: 'divider'
        }}
        className="border-b"
      >
        <Box sx={{ px: 3, py: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <h1 className="text-2xl font-bold" style={{ color: theme.palette.text.primary }}>Refactor Console</h1>
                {/* Dev-only theme debug indicator */}
                {import.meta.env.DEV && (
                  <Box sx={{ 
                    fontSize: '0.75rem',
                    px: 1,
                    py: 0.5,
                    bgcolor: 'action.hover',
                    color: theme.palette.text.secondary,
                    borderRadius: 1,
                    fontFamily: 'monospace'
                  }}>
                    {activeMode} {document.documentElement.classList.contains('dark') ? '✓' : '✗'}
                  </Box>
                )}
                {/* Health Status Indicator */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {healthStatus === 'checking' && (
                    <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: 'warning.main', animation: 'pulse 2s infinite' }} title="Checking connection..." />
                  )}
                  {healthStatus === 'ok' && (
                    <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: 'success.main' }} title="API connection healthy" />
                  )}
                  {healthStatus === 'error' && (
                    <Box 
                      sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: 'error.main', cursor: 'help' }}
                      title={healthError || 'API connection failed'}
                    />
                  )}
                </Box>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5, flexWrap: 'wrap' }}>
                <p style={{ color: theme.palette.mode === 'dark' ? theme.palette.grey[300] : theme.palette.text.secondary, margin: 0 }}>
                  Analyze your codebase for duplicates, usage patterns, and refactoring opportunities
                </p>
                <Tooltip title="Configure source and destination paths">
                  <IconButton 
                    size="small" 
                    onClick={() => setShowPathConfig(!showPathConfig)}
                    sx={{ 
                      color: showPathConfig ? theme.palette.primary.main : theme.palette.text.secondary,
                      bgcolor: showPathConfig ? alpha(theme.palette.primary.main, 0.1) : 'transparent'
                    }}
                  >
                    <Settings className="w-4 h-4" />
                  </IconButton>
                </Tooltip>
                {/* Source Type & Snapshot Indicator */}
                <Box sx={{ display: 'flex', gap: 0.5, ml: 1 }}>
                  <Chip 
                    label={sourceType === 'local' ? 'Local' : 'Remote'} 
                    size="small" 
                    color={sourceType === 'remote' ? 'secondary' : 'default'}
                    sx={{ height: 20, fontSize: '0.7rem' }}
                  />
                  {selectedSnapshot && (
                    <Chip 
                      label={`📅 ${selectedSnapshot}`} 
                      size="small" 
                      color="primary"
                      sx={{ height: 20, fontSize: '0.7rem' }}
                    />
                  )}
                </Box>
              </Box>
              {healthStatus === 'error' && healthError && (
                <p style={{ fontSize: '0.75rem', marginTop: '0.25rem', color: theme.palette.error.main }}>
                  ⚠️ {healthError}
                </p>
              )}
            </Box>
            
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              {scanData && (
                <Box sx={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.875rem', color: theme.palette.text.secondary }}>Last scan</div>
                  <div style={{ fontSize: '0.875rem', fontWeight: 500, color: theme.palette.text.primary }}>
                    {new Date(scanData.generatedAt).toLocaleString()}
                  </div>
                </Box>
              )}
              
              {/* Action Buttons */}
              <Box sx={{ display: 'flex', gap: 1 }}>
                {/* Restore History Button */}
                <Button
                  variant="outlined"
                  onClick={() => setShowHistoryViewer(true)}
                  startIcon={<History className="w-4 h-4" />}
                  sx={{ textTransform: 'none' }}
                  title="View restore history"
                >
                  History
                </Button>
                
                {/* Phase 1 Analysis Button */}
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 0.5 }}>
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={handlePhase1Analysis}
                    disabled={phase1State === 'running' || phase1State === 'starting' || healthStatus !== 'ok'}
                    startIcon={<Archive className={`w-4 h-4 ${(phase1State === 'running' || phase1State === 'starting') ? 'animate-spin' : ''}`} />}
                    sx={{ textTransform: 'none' }}
                    title={
                      healthStatus !== 'ok' 
                        ? 'Please wait for API health check to complete' 
                        : phase1State === 'running' || phase1State === 'starting'
                        ? 'Phase 1 analysis in progress'
                        : 'Phase 1: Discovery & Gap Analysis'
                    }
                  >
                    Phase 1 Analysis
                  </Button>
                  {(phase1State === 'running' || phase1State === 'starting') && (
                    <Box sx={{ fontSize: '0.75rem', color: 'text.secondary', width: '100%' }}>
                      <div className="flex items-center justify-between mb-1">
                        <span>{phase1CurrentStep || 'Processing...'}</span>
                        <span>{phase1Progress}%</span>
                      </div>
                      <Box sx={{ 
                        width: '100%',
                        bgcolor: 'action.hover',
                        borderRadius: '9999px',
                        height: 6
                      }}>
                        <Box 
                          sx={{
                            bgcolor: theme.palette.secondary.main,
                            height: 6,
                            borderRadius: '9999px',
                            transition: 'width 0.3s'
                          }}
                          style={{ width: `${phase1Progress}%` }}
                        />
                      </Box>
                    </Box>
                  )}
                  {phase1State === 'error' && phase1Error && (
                    <Box sx={{ fontSize: '0.75rem', color: 'error.main', width: '100%' }}>
                      Error: {phase1Error}
                    </Box>
                  )}
                </Box>
              </Box>
              
              <Button
                variant="contained"
                color="primary"
                onClick={handleRefresh}
                disabled={isLoading}
                startIcon={<RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />}
                sx={{
                  textTransform: 'none',
                  fontWeight: 500,
                  px: 2,
                  py: 1
                }}
              >
                Refresh
              </Button>
            </Box>
          </Box>
        </Box>
      </Box>

      {/* Session Pulse Dashboard */}
      <Box sx={{ px: 3, pt: 2 }}>
        <SessionPulse refreshInterval={10000} />
      </Box>

      {/* Path Configuration Panel */}
      <Collapse in={showPathConfig}>
        <Paper 
          elevation={0}
          sx={{ 
            mx: 3, 
            mt: 2,
            p: 2, 
            bgcolor: alpha(theme.palette.primary.main, 0.05),
            border: 1,
            borderColor: alpha(theme.palette.primary.main, 0.2),
            borderRadius: 1
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <FolderOpen className="w-5 h-5" style={{ color: theme.palette.primary.main }} />
              <h3 style={{ fontWeight: 600, color: theme.palette.text.primary, margin: 0 }}>
                Path Configuration
              </h3>
              <Chip 
                label="Persisted in localStorage" 
                size="small" 
                sx={{ fontSize: '0.7rem', height: 20 }}
              />
            </Box>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                variant="outlined"
                size="small"
                onClick={handleResetPaths}
                sx={{ textTransform: 'none' }}
              >
                Reset to Defaults
              </Button>
              <Button
                variant="contained"
                size="small"
                onClick={handleSavePaths}
                disabled={isValidatingPaths}
                startIcon={isValidatingPaths ? <CircularProgress size={14} /> : <Check className="w-4 h-4" />}
                sx={{ textTransform: 'none' }}
              >
                {isValidatingPaths ? 'Validating...' : 'Save & Validate'}
              </Button>
            </Box>
          </Box>
          
          {/* Source Type & Snapshot Selection */}
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, gap: 2, mb: 2 }}>
            {/* Source Type Toggle */}
            <Box>
              <label style={{ 
                display: 'block', 
                fontSize: '0.875rem', 
                fontWeight: 500, 
                color: theme.palette.text.primary, 
                marginBottom: '0.5rem' 
              }}>
                Source Type
              </label>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  variant={sourceType === 'local' ? 'contained' : 'outlined'}
                  size="small"
                  onClick={() => setSourceType('local')}
                  sx={{ flex: 1, textTransform: 'none' }}
                >
                  Local File System
                </Button>
                <Button
                  variant={sourceType === 'remote' ? 'contained' : 'outlined'}
                  size="small"
                  onClick={() => setSourceType('remote')}
                  sx={{ flex: 1, textTransform: 'none' }}
                  color="secondary"
                >
                  Remote Samba
                </Button>
              </Box>
              <Box sx={{ fontSize: '0.75rem', color: theme.palette.mode === 'dark' ? theme.palette.grey[400] : 'text.secondary', mt: 0.5 }}>
                {sourceType === 'local' ? 'Using local production files' : 'Using remote Samba mount (192.168.1.221)'}
              </Box>
            </Box>
            
            {/* Snapshot Selection */}
            <Box>
              <label style={{ 
                display: 'block', 
                fontSize: '0.875rem', 
                fontWeight: 500, 
                color: theme.palette.text.primary, 
                marginBottom: '0.5rem' 
              }}>
                Snapshot (MM-YYYY)
              </label>
              <TextField
                select
                fullWidth
                size="small"
                value={selectedSnapshot || ''}
                onChange={(e) => setSelectedSnapshot(e.target.value || null)}
                disabled={isLoadingSnapshots || availableSnapshots.length === 0}
                helperText={
                  isLoadingSnapshots ? 'Loading snapshots...' :
                  snapshotError ? `Error: ${snapshotError}` :
                  availableSnapshots.length === 0 ? 'No snapshots available' :
                  selectedSnapshot ? `Selected: ${availableSnapshots.find(s => s.id === selectedSnapshot)?.label || selectedSnapshot}` :
                  'Select a snapshot to scan'
                }
                error={!!snapshotError}
                SelectProps={{
                  displayEmpty: true
                }}
              >
                <option value="">Current / Latest</option>
                {availableSnapshots.map((snapshot) => (
                  <option key={snapshot.id} value={snapshot.id}>
                    {snapshot.label} ({snapshot.id})
                  </option>
                ))}
              </TextField>
            </Box>
          </Box>
          
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 2 }}>
            {/* Source Path */}
            <Box>
              <TextField
                fullWidth
                size="small"
                label="Source Directory"
                placeholder="/var/www/orthodoxmetrics/prod/refactor-src/"
                value={pathConfig.sourcePath}
                onChange={(e) => setPathConfig(prev => ({ ...prev, sourcePath: e.target.value }))}
                helperText={
                  pathValidation.sourcePath?.error || 
                  (pathValidation.sourcePath?.isValid 
                    ? (pathValidation.sourcePath.exists ? '✓ Valid & exists' : '⚠ Valid but does not exist')
                    : 'Directory containing files to restore from')
                }
                error={pathValidation.sourcePath?.isValid === false}
                InputProps={{
                  sx: { fontFamily: 'monospace', fontSize: '0.85rem' },
                  endAdornment: pathValidation.sourcePath?.isValid && (
                    <Check className="w-4 h-4" style={{ color: theme.palette.success.main }} />
                  )
                }}
              />
            </Box>
            
            {/* Destination Path */}
            <Box>
              <TextField
                fullWidth
                size="small"
                label="Destination Directory"
                placeholder="/var/www/orthodoxmetrics/prod/front-end/src/"
                value={pathConfig.destinationPath}
                onChange={(e) => setPathConfig(prev => ({ ...prev, destinationPath: e.target.value }))}
                helperText={
                  pathValidation.destinationPath?.error || 
                  (pathValidation.destinationPath?.isValid 
                    ? (pathValidation.destinationPath.exists ? '✓ Valid & exists' : '⚠ Valid but does not exist')
                    : 'Directory where files will be restored to')
                }
                error={pathValidation.destinationPath?.isValid === false}
                InputProps={{
                  sx: { fontFamily: 'monospace', fontSize: '0.85rem' },
                  endAdornment: pathValidation.destinationPath?.isValid && (
                    <Check className="w-4 h-4" style={{ color: theme.palette.success.main }} />
                  )
                }}
              />
            </Box>
            
            {/* Backup Path */}
            <Box>
              <TextField
                fullWidth
                size="small"
                label="Backup Directory (for Gap Analysis)"
                placeholder="/var/www/orthodoxmetrics/backup"
                value={pathConfig.backupPath || ''}
                onChange={(e) => setPathConfig(prev => ({ ...prev, backupPath: e.target.value }))}
                helperText={
                  pathValidation.backupPath?.error || 
                  (pathValidation.backupPath?.isValid 
                    ? (pathValidation.backupPath.exists ? '✓ Valid & exists' : '⚠ Valid but does not exist')
                    : 'September 2025 backup location for recovery')
                }
                error={pathValidation.backupPath?.isValid === false}
                InputProps={{
                  sx: { fontFamily: 'monospace', fontSize: '0.85rem' },
                  endAdornment: pathValidation.backupPath?.isValid && (
                    <Check className="w-4 h-4" style={{ color: theme.palette.success.main }} />
                  )
                }}
              />
            </Box>
          </Box>
          
          <Box sx={{ mt: 2, p: 1.5, bgcolor: 'background.paper', borderRadius: 1, border: 1, borderColor: 'divider' }}>
            <p style={{ fontSize: '0.75rem', color: theme.palette.mode === 'dark' ? theme.palette.grey[400] : theme.palette.text.secondary, margin: 0 }}>
              <strong>Security:</strong> All paths must be within <code style={{ 
                backgroundColor: alpha(theme.palette.primary.main, 0.1), 
                padding: '0 4px', 
                borderRadius: 2 
              }}>/var/www/orthodoxmetrics/</code>. 
              Path traversal and shell injection are blocked.
            </p>
          </Box>
        </Paper>
      </Collapse>

      {/* Main Content */}
      <Box sx={{ px: 3, py: 3 }}>
        {error && (
          <Box sx={{ 
            mb: 3,
            bgcolor: alpha(theme.palette.error.main, 0.1),
            border: 1,
            borderColor: theme.palette.error.main,
            borderRadius: 1,
            p: 2
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <AlertCircle style={{ width: 20, height: 20, color: theme.palette.error.main }} />
              <h3 style={{ fontWeight: 500, color: theme.palette.error.main }}>Error Loading Data</h3>
            </Box>
            <p style={{ color: theme.palette.error.main, marginTop: '0.25rem' }}>{error}</p>
            <Button
              variant="contained"
              color="error"
              onClick={handleRefresh}
              sx={{ mt: 1.5, textTransform: 'none' }}
            >
              Try Again
            </Button>
          </Box>
        )}

        {isLoading && !scanData && (
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 400 }}>
            <Box sx={{ textAlign: 'center' }}>
              <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4" style={{ color: theme.palette.primary.main }} />
              <h3 style={{ fontWeight: 500, color: theme.palette.text.primary, marginBottom: '0.5rem' }}>Analyzing Codebase</h3>
              <p style={{ color: theme.palette.mode === 'dark' ? theme.palette.grey[300] : theme.palette.text.secondary }}>This may take a few moments...</p>
            </Box>
          </Box>
        )}

        {scanData && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {/* Toolbar */}
            <Toolbar
              searchQuery={filterState.searchQuery}
              onSearchChange={handleSearchChange}
              sortOptions={sortOptions}
              currentSort={sortOption}
              onSortChange={handleSortChange}
              filterState={filterState}
              onFilterChange={handleFilterChange}
              isLoading={isLoading}
              onRefresh={handleRefresh}
              onAnalyze={handleAnalyze}
              filteredCount={filteredCount}
              totalCount={scanData.summary.totalFiles + scanData.summary.totalDirs}
              compareWithBackup={compareWithBackup}
              onToggleRecoveryMode={handleToggleRecoveryMode}
              whitelistCount={whitelistCount}
              onClearWhitelist={clearWhitelist}
            />

            {/* Stats Summary */}
            <div className="mb-3 rounded-xl border bg-white/80 px-4 py-3 border-slate-200 dark:border-slate-700/60 dark:bg-slate-900/40 dark:backdrop-blur">
              {/* Phase 1 Results - Only render when explicitly completed, validated, and progress is 100% */}
              {phase1State === 'done' && phase1Report && phase1Report.summary && phase1Progress === 100 ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <div className="flex flex-col items-center">
                      <div className="text-2xl font-semibold text-slate-900 dark:text-slate-50">
                        {phase1Report.summary?.missingInTarget ?? 0}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-300">Restorable Files</div>
                    </div>
                    <div className="flex flex-col items-center">
                      <div className="text-2xl font-semibold text-slate-900 dark:text-slate-50">
                        {phase1Report.summary?.modifiedInTarget ?? 0}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-300">Modified (Protected)</div>
                    </div>
                    <div className="flex flex-col items-center">
                      <div className="text-2xl font-semibold text-slate-900 dark:text-slate-50">
                        {phase1Report.summary?.identical ?? 0}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-300">Identical</div>
                    </div>
                    <div className="flex flex-col items-center">
                      <div className="text-2xl font-semibold text-slate-900 dark:text-slate-50">
                        {phase1Report.documentation?.endpointsVerified ?? 0}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-300">Endpoints Verified</div>
                    </div>
                    <div className="flex flex-col items-center">
                      <div className="text-2xl font-semibold text-slate-900 dark:text-slate-50">
                        {phase1Report.documentation?.endpointsMissing ?? 0}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-300">Endpoints Missing</div>
                    </div>
                  </div>
                  {(phase1Report.documentation?.endpointsFound ?? 0) > 0 && (
                    <div className="text-center text-sm text-slate-500 dark:text-slate-300">
                      Found {phase1Report.documentation?.endpointsFound ?? 0} endpoints in documentation
                    </div>
                  )}
                </div>
              ) : (phase1State === 'running' || phase1State === 'starting') ? (
                // Show loading state while Phase 1 is running
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <div className="flex flex-col items-center gap-4">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: theme.palette.secondary.main }}></div>
                    <div className="text-lg font-medium" style={{ color: theme.palette.text.primary }}>
                      {phase1CurrentStep || 'Processing...'}
                    </div>
                    <div className="w-full max-w-md">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm" style={{ color: theme.palette.mode === 'dark' ? theme.palette.grey[400] : theme.palette.text.secondary }}>Progress</span>
                        <span className="text-sm font-medium" style={{ color: theme.palette.text.primary }}>{phase1Progress}%</span>
                      </div>
                      <Box sx={{ 
                        width: '100%',
                        bgcolor: 'action.hover',
                        borderRadius: '9999px',
                        height: 8
                      }}>
                        <Box 
                          sx={{
                            bgcolor: theme.palette.secondary.main,
                            height: 8,
                            borderRadius: '9999px',
                            transition: 'width 0.3s'
                          }}
                          style={{ width: `${phase1Progress}%` }}
                        />
                      </Box>
                    </div>
                  </div>
                </Box>
              ) : scanData?.gapAnalysisEnabled ? (
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div className="flex flex-col items-center">
                    <div className="text-2xl font-semibold text-slate-900 dark:text-slate-50">
                      {scanData.summary.missingInProd || 0}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-300">Missing in Prod</div>
                  </div>
                  <div className="flex flex-col items-center">
                    <div className="text-2xl font-semibold text-slate-900 dark:text-slate-50">
                      {scanData.summary.modifiedSinceBackup || 0}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-300">Modified</div>
                  </div>
                  <div className="flex flex-col items-center">
                    <div className="text-2xl font-semibold text-slate-900 dark:text-slate-50">
                      {scanData.summary.newFiles || 0}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-300">New Files</div>
                  </div>
                  <div className="flex flex-col items-center">
                    <div className="text-2xl font-semibold text-slate-900 dark:text-slate-50">
                      {scanData.summary.likelyInProd}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-300">Production Ready</div>
                  </div>
                  <div className="flex flex-col items-center">
                    <div className="text-2xl font-semibold text-slate-900 dark:text-slate-50">
                      {scanData.summary.legacyOrDupes}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-300">Legacy/Duplicates</div>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="flex flex-col items-center">
                    <div className="text-2xl font-semibold text-slate-900 dark:text-slate-50">
                      {scanData.summary.likelyInProd}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-300">Production Ready</div>
                  </div>
                  <div className="flex flex-col items-center">
                    <div className="text-2xl font-semibold text-slate-900 dark:text-slate-50">
                      {scanData.summary.highRisk}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-300">High Risk</div>
                  </div>
                  <div className="flex flex-col items-center">
                    <div className="text-2xl font-semibold text-slate-900 dark:text-slate-50">
                      {scanData.summary.inDevelopment}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-300">In Development</div>
                  </div>
                  <div className="flex flex-col items-center">
                    <div className="text-2xl font-semibold text-slate-900 dark:text-slate-50">
                      {scanData.summary.legacyOrDupes}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-300">Legacy/Duplicates</div>
                  </div>
                </div>
              )}
            </div>

            {/* Phase 1 Restorable Files Section - Only render when explicitly completed, validated, and progress is 100% */}
            {phase1State === 'done' && phase1Progress === 100 && phase1Report && phase1Report.summary && Array.isArray(phase1Report.restorableFiles) && phase1Report.restorableFiles.length > 0 && (
              <Paper 
                elevation={0}
                sx={{ 
                  bgcolor: 'background.paper',
                  border: 1,
                  borderColor: 'divider',
                  p: 2
                }}
                className="rounded-lg"
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2" style={{ color: theme.palette.text.primary }}>
                    <FileSearch className="w-5 h-5" style={{ color: theme.palette.secondary.main }} />
                    Restorable Bundles ({bundles.size > 0 ? bundles.size : (phase1Report.restorableFiles?.length ?? 0)} {bundles.size > 0 ? 'bundles' : 'files'})
                  </h3>
                  <Button
                    variant="contained"
                    color="secondary"
                    onClick={() => {
                      // Only allow export when Phase 1 is done and report is validated
                      if (phase1State !== 'done' || !phase1Report || !phase1Report.summary) {
                        toast.warning('Phase 1 analysis must be completed before exporting');
                        return;
                      }
                      // Export JSON report
                      try {
                        const dataStr = JSON.stringify(phase1Report, null, 2);
                        const dataBlob = new Blob([dataStr], { type: 'application/json' });
                        const url = URL.createObjectURL(dataBlob);
                        const link = document.createElement('a');
                        link.href = url;
                        link.download = `phase1-report-${new Date().toISOString().split('T')[0]}.json`;
                        link.click();
                        URL.revokeObjectURL(url);
                        toast.success('Report exported successfully');
                      } catch (error) {
                        console.error('Export error:', error);
                        toast.error('Failed to export report');
                      }
                    }}
                    sx={{ textTransform: 'none' }}
                  >
                    Export JSON Report
                  </Button>
                </div>
                
                {bundles.size > 0 ? (
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {Array.from(bundles.values()).map((bundle, index) => (
                      <Box
                        key={index}
                        sx={{
                          p: 2,
                          bgcolor: theme.palette.mode === 'dark' ? theme.palette.secondary.dark + '20' : theme.palette.secondary.light,
                          border: 1,
                          borderColor: theme.palette.mode === 'dark' ? theme.palette.secondary.dark : theme.palette.secondary.main,
                          borderRadius: 1
                        }}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <div className="font-mono text-sm font-semibold mb-1" style={{ color: theme.palette.text.primary }}>
                              {bundle.rootFile.relPath}
                            </div>
                            <div className="text-xs space-y-1" style={{ color: theme.palette.text.secondary }}>
                              <div>
                                {bundle.files.length} files • {bundle.components.length} components • {bundle.hooks.length} hooks • {bundle.services.length} services
                              </div>
                              {bundle.requiredEndpoints.length > 0 && (
                                <div>
                                  {bundle.requiredEndpoints.filter(ep => ep.existsInServer).length} / {bundle.requiredEndpoints.length} endpoints verified
                                </div>
                              )}
                            </div>
                          </div>
                          <button
                            onClick={() => handleShowRequirementPreview({
                              file: bundle.rootFile,
                              imports: bundle.missingImports,
                              endpoints: bundle.requiredEndpoints,
                              integrationPoints: (phase1Report.integrationPoints?.menuItems || phase1Report.integrationPoints?.router)
                                ? [phase1Report.integrationPoints.menuItems, phase1Report.integrationPoints.router].filter(Boolean) as any
                                : []
                            })}
                            style={{
                              padding: '0.5rem',
                              color: theme.palette.secondary.main,
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              borderRadius: '0.25rem'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = theme.palette.mode === 'dark' 
                                ? theme.palette.secondary.dark + '30'
                                : theme.palette.secondary.light;
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = 'transparent';
                            }}
                            title="View requirements"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </div>
                        <RestoreBundleButton
                          bundle={bundle}
                          onRestoreComplete={() => {
                            handlePhase1Analysis(); // Refresh analysis
                            refreshScan(); // Refresh scan
                          }}
                        />
                      </Box>
                    ))}
                  </div>
                ) : (
                  <Box sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>
                    <p>No bundles calculated yet. Bundles are created for page files.</p>
                    <p style={{ fontSize: '0.875rem', marginTop: '0.5rem' }}>Individual files: {phase1Report.restorableFiles?.length ?? 0}</p>
                  </Box>
                )}
              </Paper>
            )}

            {/* Main Layout */}
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: 'repeat(4, 1fr)' }, gap: 3 }}>
              {/* Legend */}
              <Box sx={{ gridColumn: { lg: 'span 1' } }}>
                <Legend
                  scanData={scanData}
                  filterState={filterState}
                  onFilterChange={handleFilterChange}
                  whitelistCount={whitelistCount}
                />
              </Box>

              {/* File Tree */}
              <Box sx={{ gridColumn: { lg: 'span 3' } }}>
                <Tree
                  treeItems={treeItems}
                  expandedPaths={expandedPaths}
                  onToggleExpanded={handleToggleExpanded}
                  onNodeAction={handleNodeAction}
                  isDark={activeMode === 'dark'}
                  isWhitelisted={isWhitelisted}
                  onToggleWhitelist={toggleWhitelist}
                />
              </Box>
            </Box>
          </Box>
        )}
      </Box>

      {/* Modal */}
      <Modal onClose={() => setShowModal(null)} />
      
      {/* Requirement Preview Modal */}
      {showModal?.type === 'requirementPreview' && (
        <RequirementPreviewModal
          fileAnalysis={showModal.data.fileAnalysis}
          integrationPoints={showModal.data.integrationPoints}
          onClose={() => setShowModal(null)}
        />
      )}
      
      {/* Diff View Modal */}
      <DiffViewModal
        open={showDiffModal}
        onClose={handleCancelDiff}
        onConfirmRestore={handleConfirmRestore}
        preview={previewData?.preview || null}
        dependencies={previewData?.dependencies || null}
        isRestoring={isRestoring}
      />
      
      {/* Restore History Viewer */}
      <RestoreHistoryViewer
        open={showHistoryViewer}
        onClose={() => setShowHistoryViewer(false)}
      />
    </Box>
  );
};

export default RefactorConsole;
