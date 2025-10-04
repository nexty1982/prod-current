import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Grid, Card, CardContent, Button, TextField, Dialog, DialogTitle,
  DialogContent, DialogActions, List, ListItem, ListItemText, ListItemSecondaryAction,
  IconButton, Chip, LinearProgress, Alert, CircularProgress, Tabs, Tab, Accordion,
  AccordionSummary, AccordionDetails, Paper, Divider, Avatar, Tooltip
} from '@mui/material';
import {
  School as SchoolIcon, Add as AddIcon, PlayArrow as PlayIcon, Pause as PauseIcon,
  Stop as StopIcon, Edit as EditIcon, Delete as DeleteIcon, Assessment as AssessmentIcon,
  TrendingUp as TrendingUpIcon, Feedback as FeedbackIcon, ExpandMore as ExpandMoreIcon,
  Person as PersonIcon, Schedule as ScheduleIcon, CheckCircle as CheckCircleIcon,
  Warning as WarningIcon, Error as ErrorIcon
} from '@mui/icons-material';

interface TeachingSession {
  id: string;
  title: string;
  objective: string;
  status: 'active' | 'completed' | 'paused';
  createdAt: string;
  updatedAt: string;
  teacher: string;
  progress: number;
  concepts: any[];
  feedback: any[];
}

interface LearnedConcept {
  id: string;
  concept: string;
  description: string;
  examples: string[];
  confidence: number;
  validated: boolean;
  createdAt: string;
  lastTested: string;
  testResults: any[];
  category: string;
  tags: string[];
}

interface LearningAnalytics {
  totalSessions: number;
  activeSessions: number;
  completedSessions: number;
  totalConcepts: number;
  validatedConcepts: number;
  averageConfidence: number;
  learningProgress: any[];
  topConcepts: any[];
  recentFeedback: any[];
}

const TeachingDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sessions, setSessions] = useState<TeachingSession[]>([]);
  const [analytics, setAnalytics] = useState<LearningAnalytics | null>(null);
  const [selectedSession, setSelectedSession] = useState<TeachingSession | null>(null);
  
  // Dialog states
  const [newSessionDialog, setNewSessionDialog] = useState(false);
  const [newConceptDialog, setNewConceptDialog] = useState(false);
  const [feedbackDialog, setFeedbackDialog] = useState(false);
  const [testDialog, setTestDialog] = useState(false);
  
  // Form states
  const [newSession, setNewSession] = useState({ title: '', objective: '' });
  const [newConcept, setNewConcept] = useState({
    concept: '', description: '', examples: [''], category: '', tags: ['']
  });
  const [feedback, setFeedback] = useState({
    type: 'improvement' as const, content: '', impact: 'positive' as const
  });

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Simulate API calls
      const mockSessions: TeachingSession[] = [
        {
          id: '1',
          title: 'React Hooks Fundamentals',
          objective: 'Learn basic React hooks concepts',
          status: 'active',
          createdAt: '2025-01-27T10:00:00Z',
          updatedAt: '2025-01-27T11:30:00Z',
          teacher: 'system',
          progress: 75,
          concepts: [
            { id: '1', concept: 'useState', confidence: 85, validated: true },
            { id: '2', concept: 'useEffect', confidence: 70, validated: false }
          ],
          feedback: []
        },
        {
          id: '2',
          title: 'TypeScript Basics',
          objective: 'Master TypeScript fundamentals',
          status: 'completed',
          createdAt: '2025-01-26T09:00:00Z',
          updatedAt: '2025-01-26T16:00:00Z',
          teacher: 'system',
          progress: 100,
          concepts: [
            { id: '3', concept: 'Interfaces', confidence: 90, validated: true },
            { id: '4', concept: 'Generics', confidence: 85, validated: true }
          ],
          feedback: []
        }
      ];

      const mockAnalytics: LearningAnalytics = {
        totalSessions: 2,
        activeSessions: 1,
        completedSessions: 1,
        totalConcepts: 4,
        validatedConcepts: 3,
        averageConfidence: 82,
        learningProgress: [],
        topConcepts: [
          { concept: 'Interfaces', confidence: 90, usageCount: 5, lastUsed: '2025-01-26T16:00:00Z' },
          { concept: 'useState', confidence: 85, usageCount: 3, lastUsed: '2025-01-27T11:30:00Z' }
        ],
        recentFeedback: []
      };

      setSessions(mockSessions);
      setAnalytics(mockAnalytics);
      setError(null);
    } catch (err) {
      setError('Failed to load dashboard data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleStartSession = async () => {
    try {
      // Simulate API call
      const newSessionData: TeachingSession = {
        id: Date.now().toString(),
        title: newSession.title,
        objective: newSession.objective,
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        teacher: 'system',
        progress: 0,
        concepts: [],
        feedback: []
      };

      setSessions(prev => [newSessionData, ...prev]);
      setNewSessionDialog(false);
      setNewSession({ title: '', objective: '' });
    } catch (err) {
      setError('Failed to start session');
    }
  };

  const handleAddConcept = async () => {
    if (!selectedSession) return;

    try {
      const conceptData: LearnedConcept = {
        id: Date.now().toString(),
        concept: newConcept.concept,
        description: newConcept.description,
        examples: newConcept.examples.filter(e => e.trim()),
        confidence: 50,
        validated: false,
        createdAt: new Date().toISOString(),
        lastTested: new Date().toISOString(),
        testResults: [],
        category: newConcept.category,
        tags: newConcept.tags.filter(t => t.trim())
      };

      // Update session with new concept
      setSessions(prev => prev.map(s => 
        s.id === selectedSession.id 
          ? { ...s, concepts: [...s.concepts, conceptData], progress: s.progress + 10 }
          : s
      ));

      setNewConceptDialog(false);
      setNewConcept({ concept: '', description: '', examples: [''], category: '', tags: [''] });
    } catch (err) {
      setError('Failed to add concept');
    }
  };

  const handleProvideFeedback = async () => {
    if (!selectedSession) return;

    try {
      const feedbackData = {
        id: Date.now().toString(),
        sessionId: selectedSession.id,
        type: feedback.type,
        content: feedback.content,
        impact: feedback.impact,
        providedBy: 'system',
        timestamp: new Date().toISOString(),
        processed: false
      };

      // Update session with new feedback
      setSessions(prev => prev.map(s => 
        s.id === selectedSession.id 
          ? { ...s, feedback: [...s.feedback, feedbackData] }
          : s
      ));

      setFeedbackDialog(false);
      setFeedback({ type: 'improvement', content: '', impact: 'positive' });
    } catch (err) {
      setError('Failed to provide feedback');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <PlayIcon color="success" />;
      case 'completed': return <CheckCircleIcon color="primary" />;
      case 'paused': return <PauseIcon color="warning" />;
      default: return <ScheduleIcon color="disabled" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'success';
      case 'completed': return 'primary';
      case 'paused': return 'warning';
      default: return 'default';
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          <SchoolIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
          OMAI Teaching Dashboard
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setNewSessionDialog(true)}
        >
          New Session
        </Button>
      </Box>

      <Tabs value={activeTab} onChange={(_, newValue) => setActiveTab(newValue)} sx={{ mb: 3 }}>
        <Tab label="Overview" />
        <Tab label="Sessions" />
        <Tab label="Analytics" />
        <Tab label="Teaching Tools" />
      </Tabs>

      {activeTab === 0 && (
        <Grid container spacing={3}>
          {/* Analytics Cards */}
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Total Sessions
                </Typography>
                <Typography variant="h4">
                  {analytics?.totalSessions || 0}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Active Sessions
                </Typography>
                <Typography variant="h4" color="success.main">
                  {analytics?.activeSessions || 0}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Total Concepts
                </Typography>
                <Typography variant="h4">
                  {analytics?.totalConcepts || 0}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Avg Confidence
                </Typography>
                <Typography variant="h4" color="primary.main">
                  {analytics?.averageConfidence || 0}%
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          {/* Recent Sessions */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Recent Sessions
                </Typography>
                <List>
                  {sessions.slice(0, 3).map((session) => (
                    <ListItem key={session.id} button onClick={() => setSelectedSession(session)}>
                      <ListItemText
                        primary={session.title}
                        secondary={`${session.objective} • Progress: ${session.progress}%`}
                      />
                      <ListItemSecondaryAction>
                        <Chip
                          icon={getStatusIcon(session.status)}
                          label={session.status}
                          color={getStatusColor(session.status) as any}
                          size="small"
                        />
                      </ListItemSecondaryAction>
                    </ListItem>
                  ))}
                </List>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {activeTab === 1 && (
        <Grid container spacing={3}>
          {sessions.map((session) => (
            <Grid item xs={12} md={6} key={session.id}>
              <Card>
                <CardContent>
                  <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                    <Typography variant="h6">{session.title}</Typography>
                    <Chip
                      icon={getStatusIcon(session.status)}
                      label={session.status}
                      color={getStatusColor(session.status) as any}
                      size="small"
                    />
                  </Box>
                  
                  <Typography color="textSecondary" gutterBottom>
                    {session.objective}
                  </Typography>
                  
                  <Box mb={2}>
                    <Typography variant="body2" color="textSecondary">
                      Progress: {session.progress}%
                    </Typography>
                    <LinearProgress 
                      variant="determinate" 
                      value={session.progress} 
                      sx={{ mt: 1 }}
                    />
                  </Box>
                  
                  <Typography variant="body2" color="textSecondary">
                    Concepts: {session.concepts.length} • 
                    Last updated: {new Date(session.updatedAt).toLocaleDateString()}
                  </Typography>
                  
                  <Box mt={2} display="flex" gap={1}>
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => setSelectedSession(session)}
                    >
                      View Details
                    </Button>
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => setNewConceptDialog(true)}
                    >
                      Add Concept
                    </Button>
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => setFeedbackDialog(true)}
                    >
                      Provide Feedback
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {activeTab === 2 && analytics && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Top Concepts
                </Typography>
                <List>
                  {analytics.topConcepts.map((concept, index) => (
                    <ListItem key={index}>
                      <ListItemText
                        primary={concept.concept}
                        secondary={`Confidence: ${concept.confidence}% • Used ${concept.usageCount} times`}
                      />
                      <Chip
                        label={`${concept.confidence}%`}
                        color={concept.confidence >= 80 ? 'success' : concept.confidence >= 60 ? 'warning' : 'error'}
                        size="small"
                      />
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
                  Learning Statistics
                </Typography>
                <Box>
                  <Typography variant="body2">
                    Validated Concepts: {analytics.validatedConcepts} / {analytics.totalConcepts}
                  </Typography>
                  <LinearProgress 
                    variant="determinate" 
                    value={(analytics.validatedConcepts / analytics.totalConcepts) * 100}
                    sx={{ mt: 1, mb: 2 }}
                  />
                  
                  <Typography variant="body2">
                    Completion Rate: {analytics.completedSessions} / {analytics.totalSessions}
                  </Typography>
                  <LinearProgress 
                    variant="determinate" 
                    value={(analytics.completedSessions / analytics.totalSessions) * 100}
                    sx={{ mt: 1 }}
                  />
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {activeTab === 3 && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Quick Actions
                </Typography>
                <Box display="flex" flexDirection="column" gap={2}>
                  <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => setNewSessionDialog(true)}
                    fullWidth
                  >
                    Start New Session
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={<AssessmentIcon />}
                    onClick={() => {/* TODO: Open testing interface */}}
                    fullWidth
                  >
                    Test Knowledge
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={<FeedbackIcon />}
                    onClick={() => setFeedbackDialog(true)}
                    fullWidth
                  >
                    Provide Feedback
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Teaching Tips
                </Typography>
                <List>
                  <ListItem>
                    <ListItemText
                      primary="Start with clear objectives"
                      secondary="Define what you want OMAI to learn in each session"
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary="Provide examples"
                      secondary="Include practical examples to improve understanding"
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary="Validate concepts"
                      secondary="Test OMAI's understanding to ensure proper learning"
                    />
                  </ListItem>
                </List>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* New Session Dialog */}
      <Dialog open={newSessionDialog} onClose={() => setNewSessionDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Start New Teaching Session</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Session Title"
            fullWidth
            value={newSession.title}
            onChange={(e) => setNewSession(prev => ({ ...prev, title: e.target.value }))}
          />
          <TextField
            margin="dense"
            label="Objective"
            fullWidth
            multiline
            rows={3}
            value={newSession.objective}
            onChange={(e) => setNewSession(prev => ({ ...prev, objective: e.target.value }))}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNewSessionDialog(false)}>Cancel</Button>
          <Button onClick={handleStartSession} variant="contained">Start Session</Button>
        </DialogActions>
      </Dialog>

      {/* New Concept Dialog */}
      <Dialog open={newConceptDialog} onClose={() => setNewConceptDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>Add New Concept</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Concept Name"
            fullWidth
            value={newConcept.concept}
            onChange={(e) => setNewConcept(prev => ({ ...prev, concept: e.target.value }))}
          />
          <TextField
            margin="dense"
            label="Description"
            fullWidth
            multiline
            rows={3}
            value={newConcept.description}
            onChange={(e) => setNewConcept(prev => ({ ...prev, description: e.target.value }))}
          />
          <TextField
            margin="dense"
            label="Category"
            fullWidth
            value={newConcept.category}
            onChange={(e) => setNewConcept(prev => ({ ...prev, category: e.target.value }))}
          />
          <TextField
            margin="dense"
            label="Tags (comma-separated)"
            fullWidth
            value={newConcept.tags.join(', ')}
            onChange={(e) => setNewConcept(prev => ({ 
              ...prev, 
              tags: e.target.value.split(',').map(t => t.trim())
            }))}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNewConceptDialog(false)}>Cancel</Button>
          <Button onClick={handleAddConcept} variant="contained">Add Concept</Button>
        </DialogActions>
      </Dialog>

      {/* Feedback Dialog */}
      <Dialog open={feedbackDialog} onClose={() => setFeedbackDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>Provide Feedback</DialogTitle>
        <DialogContent>
          <TextField
            select
            margin="dense"
            label="Feedback Type"
            fullWidth
            value={feedback.type}
            onChange={(e) => setFeedback(prev => ({ ...prev, type: e.target.value as any }))}
            SelectProps={{ native: true }}
          >
            <option value="correction">Correction</option>
            <option value="improvement">Improvement</option>
            <option value="validation">Validation</option>
            <option value="example">Example</option>
          </TextField>
          <TextField
            margin="dense"
            label="Feedback Content"
            fullWidth
            multiline
            rows={4}
            value={feedback.content}
            onChange={(e) => setFeedback(prev => ({ ...prev, content: e.target.value }))}
          />
          <TextField
            select
            margin="dense"
            label="Impact"
            fullWidth
            value={feedback.impact}
            onChange={(e) => setFeedback(prev => ({ ...prev, impact: e.target.value as any }))}
            SelectProps={{ native: true }}
          >
            <option value="positive">Positive</option>
            <option value="negative">Negative</option>
            <option value="neutral">Neutral</option>
          </TextField>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFeedbackDialog(false)}>Cancel</Button>
          <Button onClick={handleProvideFeedback} variant="contained">Submit Feedback</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TeachingDashboard; 