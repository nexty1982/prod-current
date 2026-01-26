import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Paper,
  Stack,
  Chip,
  Divider,
  Alert,
  CircularProgress,
  IconButton,
  Tooltip,
  Grid,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Snackbar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Pagination,
  ToggleButton,
  ToggleButtonGroup
} from '@mui/material';
import {
  Send as SendIcon,
  Refresh as RefreshIcon,
  Settings as SettingsIcon,
  Code as CodeIcon,
  Storage as StorageIcon,
  Speed as SpeedIcon,
  Info as InfoIcon,
  ExpandMore as ExpandMoreIcon,
  Search as SearchIcon,
  Upload as UploadIcon,
  Memory as MemoryIcon,
  Delete as DeleteIcon,
  Visibility as VisibilityIcon,
  Psychology as PsychologyIcon,
  LightbulbOutlined as LightbulbIcon,
  QuestionAnswer as QuestionAnswerIcon
} from '@mui/icons-material';

interface OMAIResponse {
  success: boolean;
  response: string;
  context?: string[];
  sources?: string[];
  memoryContext?: string[];
  metadata?: {
    model: string;
    duration: number;
    tokens: number;
    confidence: number;
  };
  error?: string;
}

interface SystemStats {
  totalRequests: number;
  averageResponseTime: number;
  embeddingsCount: number;
  lastRequest: Date;
}

interface SystemHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  components: {
    llm: any;
    embeddings: any;
    logger: boolean;
  };
  timestamp: Date;
}

const OMAILab: React.FC = () => {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [systemStats, setSystemStats] = useState<SystemStats | null>(null);
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [responseMetadata, setResponseMetadata] = useState<any>(null);
  const [queryMode, setQueryMode] = useState<'ask' | 'search' | 'explain'>('ask');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [responseSources, setResponseSources] = useState<string[]>([]);
  const [responseMemoryContext, setResponseMemoryContext] = useState<string[]>([]);
  
  // 🧠 NEW: Consume Mode State
  const [omaiMode, setOmaiMode] = useState<'answer' | 'consume'>('answer');
  const [showSuccessSnackbar, setShowSuccessSnackbar] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [memoriesDialog, setMemoriesDialog] = useState(false);
  const [memories, setMemories] = useState<any[]>([]);
  const [memoriesPage, setMemoriesPage] = useState(1);
  const [memoriesTotal, setMemoriesTotal] = useState(0);
  const [memoriesLoading, setMemoriesLoading] = useState(false);

  // Load system stats on component mount
  useEffect(() => {
    loadSystemStats();
    loadSystemHealth();
  }, []);

  const loadSystemStats = async () => {
    try {
      const response = await fetch('/api/omai/stats');
      if (response.ok) {
        const stats = await response.json();
        setSystemStats(stats);
      }
    } catch (error) {
      console.error('Failed to load system stats:', error);
    }
  };

  const loadSystemHealth = async () => {
    try {
      const response = await fetch('/api/omai/health');
      if (response.ok) {
        const health = await response.json();
        setSystemHealth(health);
      }
    } catch (error) {
      console.error('Failed to load system health:', error);
    }
  };

  const runQuery = async () => {
    if (!input.trim()) return;

    setIsLoading(true);
    setError(null);
    setOutput('');
    setResponseMetadata(null);

    try {
      if (omaiMode === 'consume') {
        // 🧠 CONSUME MODE: Store as memory
        const response = await fetch('/api/omai/consume', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            text: input,
            priority: 'medium'
          }),
        });

        const result = await response.json();

        if (result.success) {
          setSuccessMessage(`Memory stored successfully! (Type: ${result.context_type})`);
          setShowSuccessSnackbar(true);
          setInput(''); // Clear input after successful consumption
          setOutput(`✅ Memory consumed and stored as "${result.context_type}" type.\n\nStored at: ${result.timestamp}`);
        } else {
          setError(result.error || 'Failed to store memory');
        }
      } else {
        // 🤖 ANSWER MODE: Normal OMAI query
        const response = await fetch('/api/omai/ask', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ prompt: input }),
        });

        const result: OMAIResponse = await response.json();

        if (result.success) {
          setOutput(result.response);
          setResponseMetadata(result.metadata);
          setResponseSources(result.sources || []);
          setResponseMemoryContext(result.memoryContext || []);
          
          // Add context information to output
          let contextInfo = '';
          if (result.context && result.context.length > 0) {
            contextInfo += '\n\n--- Vector Context Used ---\n' + result.context.join('\n\n');
          }
          if (result.memoryContext && result.memoryContext.length > 0) {
            contextInfo += '\n\n--- Memory Context Used ---\n' + result.memoryContext.join('\n\n');
          }
          if (result.sources && result.sources.length > 0) {
            contextInfo += '\n\n--- Sources ---\n' + result.sources.join('\n');
          }
          
          if (contextInfo) {
            setOutput(prev => prev + contextInfo);
          }
        } else {
          setError(result.error || 'Failed to get response');
        }
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setIsLoading(false);
      loadSystemStats(); // Refresh stats after query
    }
  };

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
      runQuery();
    }
  };

  // 🧠 NEW: Memory Management Functions
  const loadMemories = async (page = 1) => {
    setMemoriesLoading(true);
    try {
      const response = await fetch(`/api/omai/memories?limit=10&offset=${(page - 1) * 10}`);
      const result = await response.json();
      
      if (result.success) {
        setMemories(result.memories);
        setMemoriesTotal(Math.ceil(result.total / 10));
      }
    } catch (error) {
      console.error('Failed to load memories:', error);
    } finally {
      setMemoriesLoading(false);
    }
  };

  const deleteMemory = async (id: number) => {
    try {
      const response = await fetch(`/api/omai/memories/${id}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        loadMemories(memoriesPage); // Refresh memories
        setSuccessMessage('Memory deleted successfully');
        setShowSuccessSnackbar(true);
      }
    } catch (error) {
      console.error('Failed to delete memory:', error);
    }
  };

  const openMemoriesDialog = () => {
    setMemoriesDialog(true);
    loadMemories(1);
  };

  const getHealthColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'success';
      case 'degraded': return 'warning';
      case 'unhealthy': return 'error';
      default: return 'default';
    }
  };

  const getHealthIcon = (status: string) => {
    switch (status) {
      case 'healthy': return '🟢';
      case 'degraded': return '🟡';
      case 'unhealthy': return '🔴';
      default: return '⚪';
    }
  };

  return (
    <Box sx={{ p: 3, maxWidth: 1200, margin: '0 auto' }}>
      <Stack spacing={3}>
        {/* Header */}
        <Card>
          <CardContent>
            <Stack direction="row" alignItems="center" spacing={2}>
              <CodeIcon sx={{ fontSize: 32, color: 'primary.main' }} />
              <Box>
                <Typography variant="h4" component="h1" gutterBottom>
                  🧠 OM-AI Local Lab
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  Test and interact with the OrthodoxMetrics AI system
                </Typography>
              </Box>
            </Stack>
          </CardContent>
        </Card>

        {/* System Status */}
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <InfoIcon />
                  System Health
                </Typography>
                {systemHealth ? (
                  <Stack spacing={1}>
                    <Chip
                      label={`Status: ${systemHealth.status}`}
                      color={getHealthColor(systemHealth.status) as any}
                      icon={<span>{getHealthIcon(systemHealth.status)}</span>}
                    />
                    <Typography variant="body2" color="text.secondary">
                      LLM: {systemHealth.components.llm?.status || 'unknown'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Embeddings: {systemHealth.components.embeddings?.totalEmbeddings || 0} entries
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Last updated: {systemHealth.timestamp.toLocaleString()}
                    </Typography>
                  </Stack>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    Loading system health...
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <SpeedIcon />
                  System Stats
                </Typography>
                {systemStats ? (
                  <Stack spacing={1}>
                    <Typography variant="body2" color="text.secondary">
                      Total Requests: {systemStats.totalRequests}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Avg Response Time: {systemStats.averageResponseTime.toFixed(0)}ms
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Embeddings: {systemStats.embeddingsCount} entries
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Last Request: {systemStats.lastRequest.toLocaleString()}
                    </Typography>
                  </Stack>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    Loading system stats...
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Input Area */}
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              OM-AI Query Interface
            </Typography>
            <Stack spacing={2}>
              {/* Mode Selection */}
              <FormControl fullWidth>
                <InputLabel>Query Mode</InputLabel>
                <Select
                  value={queryMode}
                  onChange={(e) => setQueryMode(e.target.value as 'ask' | 'search' | 'explain')}
                  label="Query Mode"
                  disabled={isLoading}
                >
                  <MenuItem value="ask">
                    <Stack direction="row" spacing={1} alignItems="center">
                      <QuestionAnswerIcon />
                      <span>Ask Question</span>
                    </Stack>
                  </MenuItem>
                  <MenuItem value="search">
                    <Stack direction="row" spacing={1} alignItems="center">
                      <SearchIcon />
                      <span>Search Source</span>
                    </Stack>
                  </MenuItem>
                  <MenuItem value="explain">
                    <Stack direction="row" spacing={1} alignItems="center">
                      <CodeIcon />
                      <span>Explain File</span>
                    </Stack>
                  </MenuItem>
                </Select>
              </FormControl>

              {/* 🧠 NEW: OMAI Mode Toggle */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Typography variant="subtitle2" color="text.secondary">
                  OMAI Mode:
                </Typography>
                <ToggleButtonGroup
                  value={omaiMode}
                  exclusive
                  onChange={(e, newMode) => newMode && setOmaiMode(newMode)}
                  size="small"
                >
                  <ToggleButton value="answer" sx={{ px: 2 }}>
                    <PsychologyIcon sx={{ mr: 1, fontSize: 18 }} />
                    Answer
                  </ToggleButton>
                  <ToggleButton value="consume" sx={{ px: 2 }}>
                    <LightbulbIcon sx={{ mr: 1, fontSize: 18 }} />
                    Consume
                  </ToggleButton>
                </ToggleButtonGroup>
                <Tooltip title="Answer: Get AI responses | Consume: Store as long-term memory">
                  <IconButton size="small">
                    <InfoIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<VisibilityIcon />}
                  onClick={openMemoriesDialog}
                >
                  View Memories
                </Button>
              </Box>

              {/* File Upload for Explain Mode */}
              {queryMode === 'explain' && (
                <Box>
                  <input
                    accept=".ts,.tsx,.js,.jsx,.md,.json,.sql"
                    style={{ display: 'none' }}
                    id="file-upload"
                    type="file"
                    onChange={(e) => setUploadedFile(e.target.files?.[0] || null)}
                  />
                  <label htmlFor="file-upload">
                    <Button
                      variant="outlined"
                      component="span"
                      startIcon={<UploadIcon />}
                      disabled={isLoading}
                    >
                      {uploadedFile ? uploadedFile.name : 'Upload File to Explain'}
                    </Button>
                  </label>
                  {uploadedFile && (
                    <Chip
                      label={`File: ${uploadedFile.name}`}
                      onDelete={() => setUploadedFile(null)}
                      sx={{ ml: 1 }}
                    />
                  )}
                </Box>
              )}

              {/* Query Input */}
              <TextField
                fullWidth
                multiline
                rows={4}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={
                  omaiMode === 'consume'
                    ? "Enter knowledge, notes, or information for OMAI to remember and learn from..."
                    : queryMode === 'ask' 
                    ? "Ask me anything about OrthodoxMetrics, code analysis, database queries, or system operations..."
                    : queryMode === 'search'
                    ? "Search for specific files, components, or functionality..."
                    : "Upload a file and ask me to explain it..."
                }
                variant="outlined"
                disabled={isLoading}
              />

              {/* Action Buttons */}
              <Stack direction="row" spacing={2} justifyContent="space-between">
                <Stack direction="row" spacing={1}>
                  <Button
                    variant="contained"
                    onClick={runQuery}
                    disabled={isLoading || !input.trim()}
                    startIcon={isLoading ? <CircularProgress size={20} /> : <SendIcon />}
                  >
                    {isLoading 
                      ? 'Processing...' 
                      : omaiMode === 'consume' 
                        ? 'Store Memory' 
                        : `Execute ${queryMode === 'ask' ? 'Query' : queryMode === 'search' ? 'Search' : 'Analysis'}`
                    }
                  </Button>
                  <Tooltip title="Refresh System Stats">
                    <IconButton onClick={loadSystemStats} disabled={isLoading}>
                      <RefreshIcon />
                    </IconButton>
                  </Tooltip>
                </Stack>
                <Button
                  variant="outlined"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  startIcon={<SettingsIcon />}
                >
                  Advanced
                </Button>
              </Stack>
            </Stack>
          </CardContent>
        </Card>

        {/* Advanced Settings */}
        {showAdvanced && (
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Advanced Settings
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Model Configuration
                  </Typography>
                  <Stack spacing={1}>
                    <Chip label="Model: CodeLlama GGUF" size="small" />
                    <Chip label="Backend: Ollama" size="small" />
                    <Chip label="GPU: Enabled" size="small" />
                  </Stack>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Vector Search
                  </Typography>
                  <Stack spacing={1}>
                    <Chip label="Max Results: 5" size="small" />
                    <Chip label="Similarity Threshold: 0.7" size="small" />
                    <Chip label="Max Context: 4096 chars" size="small" />
                  </Stack>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        )}

        {/* Output Area */}
        {output && (
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Response
              </Typography>
              <Paper
                sx={{
                  p: 2,
                  backgroundColor: (theme) => theme.palette.mode === 'dark' ? '#1e1e1e' : '#f9f9f9',
                  color: (theme) => theme.palette.mode === 'dark' ? '#ffffff' : '#111111',
                  fontFamily: 'monospace',
                  fontSize: '0.875rem',
                  maxHeight: 400,
                  overflow: 'auto',
                  border: (theme) => `1px solid ${theme.palette.divider}`,
                  borderRadius: 2,
                  whiteSpace: 'pre-wrap'
                }}
              >
                <pre style={{ 
                  margin: 0, 
                  whiteSpace: 'pre-wrap',
                  fontFamily: 'inherit',
                  color: 'inherit'
                }}>{output}</pre>
              </Paper>
              
              {/* Context Information */}
              {(responseSources.length > 0 || responseMemoryContext.length > 0) && (
                <Box sx={{ mt: 2 }}>
                  <Accordion>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Typography variant="subtitle2">Context Information</Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Stack spacing={2}>
                        {responseSources.length > 0 && (
                          <Box>
                            <Typography variant="subtitle2" gutterBottom>
                              Sources Used ({responseSources.length})
                            </Typography>
                            <List dense>
                              {responseSources.map((source, index) => (
                                <ListItem key={index}>
                                  <ListItemIcon>
                                    <StorageIcon fontSize="small" />
                                  </ListItemIcon>
                                  <ListItemText primary={source} />
                                </ListItem>
                              ))}
                            </List>
                          </Box>
                        )}
                        
                        {responseMemoryContext.length > 0 && (
                          <Box>
                            <Typography variant="subtitle2" gutterBottom>
                              Memory Context ({responseMemoryContext.length})
                            </Typography>
                            <List dense>
                              {responseMemoryContext.map((context, index) => (
                                <ListItem key={index}>
                                  <ListItemIcon>
                                    <InfoIcon fontSize="small" />
                                  </ListItemIcon>
                                  <ListItemText primary={context} />
                                </ListItem>
                              ))}
                            </List>
                          </Box>
                        )}
                      </Stack>
                    </AccordionDetails>
                  </Accordion>
                </Box>
              )}
              
              {responseMetadata && (
                <Box sx={{ mt: 2 }}>
                  <Accordion>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Typography variant="subtitle2">Response Metadata</Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Stack spacing={1}>
                        <Typography variant="body2">
                          Model: {responseMetadata.model}
                        </Typography>
                        <Typography variant="body2">
                          Duration: {responseMetadata.duration}ms
                        </Typography>
                        <Typography variant="body2">
                          Tokens: {responseMetadata.tokens}
                        </Typography>
                        <Typography variant="body2">
                          Confidence: {(responseMetadata.confidence * 100).toFixed(1)}%
                        </Typography>
                      </Stack>
                    </AccordionDetails>
                  </Accordion>
                </Box>
              )}
            </CardContent>
          </Card>
        )}

        {/* Error Display */}
        {error && (
          <Alert severity="error" onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* Quick Examples */}
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Quick Examples
            </Typography>
            <Stack spacing={1}>
              <Button
                variant="outlined"
                size="small"
                onClick={() => setInput('Explain the OrthodoxMetrics database schema')}
              >
                Database Schema
              </Button>
              <Button
                variant="outlined"
                size="small"
                onClick={() => setInput('How does the Big Book system work?')}
              >
                Big Book System
              </Button>
              <Button
                variant="outlined"
                size="small"
                onClick={() => setInput('Analyze the React component structure')}
              >
                React Components
              </Button>
              <Button
                variant="outlined"
                size="small"
                onClick={() => setInput('What are the main API endpoints?')}
              >
                API Endpoints
              </Button>
            </Stack>
          </CardContent>
        </Card>
      </Stack>

      {/* 🧠 NEW: Success Snackbar */}
      <Snackbar
        open={showSuccessSnackbar}
        autoHideDuration={4000}
        onClose={() => setShowSuccessSnackbar(false)}
        message={successMessage}
      />

      {/* 🧠 NEW: Memories Dialog */}
      <Dialog 
        open={memoriesDialog} 
        onClose={() => setMemoriesDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Stack direction="row" alignItems="center" spacing={1}>
            <MemoryIcon />
            <Typography variant="h6">OMAI Long-term Memories</Typography>
          </Stack>
        </DialogTitle>
        <DialogContent>
          {memoriesLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <>
              <TableContainer component={Paper} sx={{ maxHeight: 400 }}>
                                 <Table stickyHeader>
                   <TableHead>
                     <TableRow>
                       <TableCell>Content</TableCell>
                       <TableCell>Agent/Source</TableCell>
                       <TableCell>Type</TableCell>
                       <TableCell>Importance</TableCell>
                       <TableCell>Date</TableCell>
                       <TableCell>Actions</TableCell>
                     </TableRow>
                   </TableHead>
                   <TableBody>
                     {memories.map((memory) => (
                       <TableRow key={memory.id}>
                         <TableCell sx={{ maxWidth: 250 }}>
                           <Typography variant="body2" sx={{ 
                             overflow: 'hidden', 
                             textOverflow: 'ellipsis',
                             whiteSpace: 'nowrap'
                           }}>
                             {memory.text}
                           </Typography>
                           {memory.tags && (
                             <Box sx={{ mt: 0.5 }}>
                               {JSON.parse(memory.tags).slice(0, 2).map((tag: string, index: number) => (
                                 <Chip 
                                   key={index}
                                   label={tag} 
                                   size="small" 
                                   variant="outlined"
                                   sx={{ mr: 0.5, fontSize: '0.7rem', height: 16 }}
                                 />
                               ))}
                             </Box>
                           )}
                         </TableCell>
                         <TableCell sx={{ minWidth: 120 }}>
                           {memory.source_agent ? (
                             <Stack spacing={0.5}>
                               <Chip 
                                 label={memory.source_agent} 
                                 size="small" 
                                 color="secondary"
                                 icon={<PsychologyIcon fontSize="small" />}
                               />
                               {memory.source_module && (
                                 <Typography variant="caption" color="text.secondary">
                                   {memory.source_module}
                                 </Typography>
                               )}
                               <Chip 
                                 label={memory.ingestion_method || 'manual'} 
                                 size="small" 
                                 variant="outlined"
                                 sx={{ fontSize: '0.7rem', height: 16 }}
                               />
                             </Stack>
                           ) : (
                             <Chip 
                               label="Manual" 
                               size="small" 
                               variant="outlined"
                             />
                           )}
                         </TableCell>
                         <TableCell>
                           <Chip 
                             label={memory.context_type} 
                             size="small" 
                             color="primary"
                           />
                         </TableCell>
                         <TableCell>
                           <Chip 
                             label={memory.importance || memory.priority || 'normal'} 
                             size="small" 
                             color={
                               (memory.importance === 'high' || memory.priority === 'high') ? 'error' :
                               (memory.importance === 'low' || memory.priority === 'low') ? 'default' : 'warning'
                             }
                           />
                         </TableCell>
                         <TableCell>
                           <Typography variant="body2" color="text.secondary">
                             {new Date(memory.timestamp).toLocaleDateString()}
                           </Typography>
                         </TableCell>
                         <TableCell>
                           <IconButton 
                             size="small" 
                             onClick={() => deleteMemory(memory.id)}
                             color="error"
                           >
                             <DeleteIcon fontSize="small" />
                           </IconButton>
                         </TableCell>
                       </TableRow>
                     ))}
                   </TableBody>
                 </Table>
              </TableContainer>
              
              {memoriesTotal > 1 && (
                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
                  <Pagination
                    count={memoriesTotal}
                    page={memoriesPage}
                    onChange={(e, page) => {
                      setMemoriesPage(page);
                      loadMemories(page);
                    }}
                  />
                </Box>
              )}
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMemoriesDialog(false)}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default OMAILab; 