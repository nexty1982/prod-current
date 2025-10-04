import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Chip,
  Paper,
  Tabs,
  Tab,
  Divider,
  Alert,
  CircularProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel
} from '@mui/material';
import {
  Chat as ChatIcon,
  Description as DocumentIcon,
  Psychology as NLPIcon,
  PlayArrow as StartIcon,
  Stop as StopIcon,
  Send as SendIcon,
  Analytics as AnalyticsIcon,
  Settings as SettingsIcon,
  ExpandMore as ExpandMoreIcon,
  Add as AddIcon,
  Search as SearchIcon,
  Download as DownloadIcon,
  Upload as UploadIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Visibility as ViewIcon
} from '@mui/icons-material';

// Interface definitions
interface NLPSession {
  id: string;
  userId: string;
  type: 'conversation' | 'document_analysis' | 'text_processing' | 'mixed';
  status: 'active' | 'paused' | 'completed' | 'error';
  startTime: string;
  endTime?: string;
  metadata: {
    conversationId?: string;
    documentIds?: string[];
    requestCount: number;
    averageResponseTime: number;
    lastActivity: string;
  };
}

interface Conversation {
  id: string;
  title: string;
  participants: string[];
  messages: ConversationMessage[];
  context: any;
  status: 'active' | 'paused' | 'ended';
  createdAt: string;
  updatedAt: string;
}

interface ConversationMessage {
  id: string;
  conversationId: string;
  sender: string;
  content: string;
  type: 'text' | 'command' | 'system' | 'action';
  timestamp: string;
}

interface Document {
  id: string;
  title: string;
  content: string;
  type: 'text' | 'markdown' | 'html' | 'json' | 'xml';
  source: string;
  metadata: any;
  processedAt: string;
  analysis?: any;
}

interface NLPMetrics {
  totalRequests: number;
  averageResponseTime: number;
  successRate: number;
  activeSessions: number;
  totalConversations: number;
  totalDocuments: number;
  languageModels: number;
  lastUpdated: string;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`nlp-tabpanel-${index}`}
      aria-labelledby={`nlp-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const NLPDashboard: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const [sessions, setSessions] = useState<NLPSession[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [metrics, setMetrics] = useState<NLPMetrics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Dialog states
  const [sessionDialogOpen, setSessionDialogOpen] = useState(false);
  const [conversationDialogOpen, setConversationDialogOpen] = useState(false);
  const [documentDialogOpen, setDocumentDialogOpen] = useState(false);
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);

  // Form states
  const [newSessionType, setNewSessionType] = useState('conversation');
  const [newConversationTitle, setNewConversationTitle] = useState('');
  const [newConversationParticipants, setNewConversationParticipants] = useState('');
  const [newDocumentTitle, setNewDocumentTitle] = useState('');
  const [newDocumentContent, setNewDocumentContent] = useState('');
  const [newDocumentType, setNewDocumentType] = useState('text');

  // Conversation states
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messageInput, setMessageInput] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      // Load sessions, conversations, documents, and metrics
      const [sessionsRes, conversationsRes, documentsRes, metricsRes] = await Promise.all([
        fetch('/api/nlp/sessions'),
        fetch('/api/nlp/conversations'),
        fetch('/api/nlp/documents'),
        fetch('/api/nlp/metrics')
      ]);

      if (sessionsRes.ok) setSessions(await sessionsRes.json());
      if (conversationsRes.ok) setConversations(await conversationsRes.json());
      if (documentsRes.ok) setDocuments(await documentsRes.json());
      if (metricsRes.ok) setMetrics(await metricsRes.json());
    } catch (err) {
      setError('Failed to load NLP data');
      console.error('Error loading NLP data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const createSession = async () => {
    try {
      const response = await fetch('/api/nlp/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: newSessionType })
      });

      if (response.ok) {
        await loadData();
        setSessionDialogOpen(false);
        setNewSessionType('conversation');
      }
    } catch (err) {
      setError('Failed to create session');
    }
  };

  const createConversation = async () => {
    try {
      const participants = newConversationParticipants.split(',').map(p => p.trim());
      const response = await fetch('/api/nlp/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newConversationTitle,
          participants
        })
      });

      if (response.ok) {
        await loadData();
        setConversationDialogOpen(false);
        setNewConversationTitle('');
        setNewConversationParticipants('');
      }
    } catch (err) {
      setError('Failed to create conversation');
    }
  };

  const processDocument = async () => {
    try {
      const response = await fetch('/api/nlp/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newDocumentTitle,
          content: newDocumentContent,
          type: newDocumentType,
          source: 'manual'
        })
      });

      if (response.ok) {
        await loadData();
        setDocumentDialogOpen(false);
        setNewDocumentTitle('');
        setNewDocumentContent('');
        setNewDocumentType('text');
      }
    } catch (err) {
      setError('Failed to process document');
    }
  };

  const sendMessage = async (conversationId: string) => {
    if (!messageInput.trim()) return;

    try {
      const response = await fetch(`/api/nlp/conversations/${conversationId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sender: 'user',
          content: messageInput
        })
      });

      if (response.ok) {
        setMessageInput('');
        await loadData();
      }
    } catch (err) {
      setError('Failed to send message');
    }
  };

  const endSession = async (sessionId: string) => {
    try {
      const response = await fetch(`/api/nlp/sessions/${sessionId}/end`, {
        method: 'POST'
      });

      if (response.ok) {
        await loadData();
      }
    } catch (err) {
      setError('Failed to end session');
    }
  };

  const analyzeDocument = async (documentId: string) => {
    try {
      const response = await fetch(`/api/nlp/documents/${documentId}/analyze`, {
        method: 'POST'
      });

      if (response.ok) {
        await loadData();
      }
    } catch (err) {
      setError('Failed to analyze document');
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          <NLPIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
          OMAI Natural Language Processing
        </Typography>
        <Button
          variant="outlined"
          startIcon={<SettingsIcon />}
          onClick={() => setSettingsDialogOpen(true)}
        >
          Settings
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Metrics Overview */}
      {metrics && (
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Total Requests
                </Typography>
                <Typography variant="h4">{metrics.totalRequests}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Active Sessions
                </Typography>
                <Typography variant="h4">{metrics.activeSessions}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Conversations
                </Typography>
                <Typography variant="h4">{metrics.totalConversations}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Documents
                </Typography>
                <Typography variant="h4">{metrics.totalDocuments}</Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Main Content Tabs */}
      <Paper sx={{ width: '100%' }}>
        <Tabs value={tabValue} onChange={handleTabChange} aria-label="NLP tabs">
          <Tab label="Sessions" />
          <Tab label="Conversations" />
          <Tab label="Documents" />
          <Tab label="Analytics" />
        </Tabs>

        {/* Sessions Tab */}
        <TabPanel value={tabValue} index={0}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6">NLP Sessions</Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setSessionDialogOpen(true)}
            >
              New Session
            </Button>
          </Box>

          <List>
            {sessions.map((session) => (
              <ListItem key={session.id} divider>
                <ListItemText
                  primary={session.type}
                  secondary={`Status: ${session.status} | Requests: ${session.metadata.requestCount} | Last Activity: ${new Date(session.metadata.lastActivity).toLocaleString()}`}
                />
                <ListItemSecondaryAction>
                  {session.status === 'active' && (
                    <IconButton
                      edge="end"
                      onClick={() => endSession(session.id)}
                      color="error"
                    >
                      <StopIcon />
                    </IconButton>
                  )}
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>
        </TabPanel>

        {/* Conversations Tab */}
        <TabPanel value={tabValue} index={1}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6">Conversations</Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setConversationDialogOpen(true)}
            >
              New Conversation
            </Button>
          </Box>

          <Grid container spacing={2}>
            <Grid item xs={12} md={4}>
              <List>
                {conversations.map((conversation) => (
                  <ListItem
                    key={conversation.id}
                    button
                    selected={selectedConversation?.id === conversation.id}
                    onClick={() => setSelectedConversation(conversation)}
                  >
                    <ListItemText
                      primary={conversation.title}
                      secondary={`${conversation.messages.length} messages | ${conversation.status}`}
                    />
                  </ListItem>
                ))}
              </List>
            </Grid>
            <Grid item xs={12} md={8}>
              {selectedConversation && (
                <Paper sx={{ p: 2, height: '400px', display: 'flex', flexDirection: 'column' }}>
                  <Typography variant="h6" gutterBottom>
                    {selectedConversation.title}
                  </Typography>
                  <Box sx={{ flexGrow: 1, overflow: 'auto', mb: 2 }}>
                    {selectedConversation.messages.map((message) => (
                      <Box
                        key={message.id}
                        sx={{
                          mb: 1,
                          textAlign: message.sender === 'user' ? 'right' : 'left'
                        }}
                      >
                        <Chip
                          label={message.content}
                          color={message.sender === 'user' ? 'primary' : 'default'}
                          sx={{ maxWidth: '70%' }}
                        />
                      </Box>
                    ))}
                  </Box>
                  <Box display="flex" gap={1}>
                    <TextField
                      fullWidth
                      size="small"
                      placeholder="Type a message..."
                      value={messageInput}
                      onChange={(e) => setMessageInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && sendMessage(selectedConversation.id)}
                    />
                    <Button
                      variant="contained"
                      onClick={() => sendMessage(selectedConversation.id)}
                    >
                      <SendIcon />
                    </Button>
                  </Box>
                </Paper>
              )}
            </Grid>
          </Grid>
        </TabPanel>

        {/* Documents Tab */}
        <TabPanel value={tabValue} index={2}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6">Documents</Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setDocumentDialogOpen(true)}
            >
              Process Document
            </Button>
          </Box>

          <List>
            {documents.map((document) => (
              <ListItem key={document.id} divider>
                <ListItemText
                  primary={document.title}
                  secondary={`Type: ${document.type} | Size: ${document.content.length} chars | Processed: ${new Date(document.processedAt).toLocaleString()}`}
                />
                <ListItemSecondaryAction>
                  <IconButton
                    edge="end"
                    onClick={() => analyzeDocument(document.id)}
                    disabled={!!document.analysis}
                  >
                    <AnalyticsIcon />
                  </IconButton>
                  <IconButton edge="end">
                    <ViewIcon />
                  </IconButton>
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>
        </TabPanel>

        {/* Analytics Tab */}
        <TabPanel value={tabValue} index={3}>
          <Typography variant="h6" gutterBottom>
            NLP Analytics
          </Typography>
          {metrics && (
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Performance Metrics
                    </Typography>
                    <Typography>Average Response Time: {metrics.averageResponseTime.toFixed(2)}ms</Typography>
                    <Typography>Success Rate: {(metrics.successRate * 100).toFixed(1)}%</Typography>
                    <Typography>Language Models: {metrics.languageModels}</Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      System Status
                    </Typography>
                    <Typography>Last Updated: {new Date(metrics.lastUpdated).toLocaleString()}</Typography>
                    <Typography>Active Sessions: {metrics.activeSessions}</Typography>
                    <Typography>Total Conversations: {metrics.totalConversations}</Typography>
                    <Typography>Total Documents: {metrics.totalDocuments}</Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          )}
        </TabPanel>
      </Paper>

      {/* Session Dialog */}
      <Dialog open={sessionDialogOpen} onClose={() => setSessionDialogOpen(false)}>
        <DialogTitle>Create New NLP Session</DialogTitle>
        <DialogContent>
          <FormControl fullWidth sx={{ mt: 1 }}>
            <InputLabel>Session Type</InputLabel>
            <Select
              value={newSessionType}
              onChange={(e) => setNewSessionType(e.target.value)}
            >
              <MenuItem value="conversation">Conversation</MenuItem>
              <MenuItem value="document_analysis">Document Analysis</MenuItem>
              <MenuItem value="text_processing">Text Processing</MenuItem>
              <MenuItem value="mixed">Mixed</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSessionDialogOpen(false)}>Cancel</Button>
          <Button onClick={createSession} variant="contained">Create</Button>
        </DialogActions>
      </Dialog>

      {/* Conversation Dialog */}
      <Dialog open={conversationDialogOpen} onClose={() => setConversationDialogOpen(false)}>
        <DialogTitle>Create New Conversation</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Title"
            value={newConversationTitle}
            onChange={(e) => setNewConversationTitle(e.target.value)}
            sx={{ mt: 1 }}
          />
          <TextField
            fullWidth
            label="Participants (comma-separated)"
            value={newConversationParticipants}
            onChange={(e) => setNewConversationParticipants(e.target.value)}
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConversationDialogOpen(false)}>Cancel</Button>
          <Button onClick={createConversation} variant="contained">Create</Button>
        </DialogActions>
      </Dialog>

      {/* Document Dialog */}
      <Dialog 
        open={documentDialogOpen} 
        onClose={() => setDocumentDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Process Document</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Title"
            value={newDocumentTitle}
            onChange={(e) => setNewDocumentTitle(e.target.value)}
            sx={{ mt: 1 }}
          />
          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel>Document Type</InputLabel>
            <Select
              value={newDocumentType}
              onChange={(e) => setNewDocumentType(e.target.value)}
            >
              <MenuItem value="text">Text</MenuItem>
              <MenuItem value="markdown">Markdown</MenuItem>
              <MenuItem value="html">HTML</MenuItem>
              <MenuItem value="json">JSON</MenuItem>
              <MenuItem value="xml">XML</MenuItem>
            </Select>
          </FormControl>
          <TextField
            fullWidth
            multiline
            rows={8}
            label="Content"
            value={newDocumentContent}
            onChange={(e) => setNewDocumentContent(e.target.value)}
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDocumentDialogOpen(false)}>Cancel</Button>
          <Button onClick={processDocument} variant="contained">Process</Button>
        </DialogActions>
      </Dialog>

      {/* Settings Dialog */}
      <Dialog 
        open={settingsDialogOpen} 
        onClose={() => setSettingsDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>NLP Settings</DialogTitle>
        <DialogContent>
          <Typography variant="h6" gutterBottom>
            Language Models
          </Typography>
          <FormControlLabel
            control={<Switch defaultChecked />}
            label="Enable Advanced NLP"
          />
          <FormControlLabel
            control={<Switch defaultChecked />}
            label="Auto-analyze Documents"
          />
          <FormControlLabel
            control={<Switch />}
            label="Enable Sentiment Analysis"
          />
          <FormControlLabel
            control={<Switch />}
            label="Enable Entity Extraction"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSettingsDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default NLPDashboard; 