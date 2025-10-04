import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Accordion, AccordionSummary, AccordionDetails, 
  Chip, Alert, Button, CircularProgress, Grid, Card, CardContent,
  IconButton, Tooltip, Divider, LinearProgress
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import WarningIcon from '@mui/icons-material/Warning';
import InfoIcon from '@mui/icons-material/Info';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import RefreshIcon from '@mui/icons-material/Refresh';
import { BoundComponent } from './types';

interface AgentTaskResult {
  agent: string;
  componentId: string;
  action: string;
  status: 'success' | 'warning' | 'error' | 'info';
  result: string;
  recommendation?: string;
  canAutofix: boolean;
  autofixAction?: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

interface ComponentAgentPanelProps {
  component: BoundComponent | null;
  onAutofix?: (agentName: string, action: string) => void;
}

const ComponentAgentPanel: React.FC<ComponentAgentPanelProps> = ({
  component,
  onAutofix
}) => {
  const [agentResults, setAgentResults] = useState<AgentTaskResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRunningAgents, setIsRunningAgents] = useState(false);
  const [metrics, setMetrics] = useState<any>(null);

  useEffect(() => {
    if (component) {
      loadAgentResults();
      loadMetrics();
    }
  }, [component]);

  const loadAgentResults = async () => {
    if (!component) return;
    
    setIsLoading(true);
    try {
      const response = await fetch(`/api/omai/agent-results/${component.id}`);
      if (response.ok) {
        const results = await response.json();
        setAgentResults(results);
      }
    } catch (error) {
      console.error('Failed to load agent results:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadMetrics = async () => {
    try {
      const response = await fetch('/api/omai/agent-metrics');
      if (response.ok) {
        const metricsData = await response.json();
        setMetrics(metricsData);
      }
    } catch (error) {
      console.error('Failed to load agent metrics:', error);
    }
  };

  const runAgents = async () => {
    if (!component) return;
    
    setIsRunningAgents(true);
    try {
      const response = await fetch('/api/omai/run-agents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ component }),
      });

      if (response.ok) {
        const results = await response.json();
        setAgentResults(results);
        loadMetrics(); // Refresh metrics after running agents
      }
    } catch (error) {
      console.error('Failed to run agents:', error);
    } finally {
      setIsRunningAgents(false);
    }
  };

  const handleAutofix = async (agentName: string, action: string) => {
    if (!component) return;
    
    try {
      const response = await fetch('/api/omai/autofix', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          componentId: component.id,
          agent: agentName,
          action 
        }),
      });

      if (response.ok) {
        // Reload results after autofix
        await loadAgentResults();
        await loadMetrics();
      }
    } catch (error) {
      console.error('Failed to execute autofix:', error);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircleIcon color="success" />;
      case 'warning':
        return <WarningIcon color="warning" />;
      case 'error':
        return <ErrorIcon color="error" />;
      default:
        return <InfoIcon color="info" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'success';
      case 'warning':
        return 'warning';
      case 'error':
        return 'error';
      default:
        return 'info';
    }
  };

  if (!component) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>🤖 OMAI Tasks</Typography>
        <Alert severity="info">Select a component to run agent analysis</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h6">🤖 OMAI Tasks</Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title="Refresh Results">
            <IconButton onClick={loadAgentResults} disabled={isLoading}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          <Button
            variant="contained"
            size="small"
            onClick={runAgents}
            disabled={isRunningAgents}
            startIcon={isRunningAgents ? <CircularProgress size={16} /> : null}
          >
            {isRunningAgents ? 'Running...' : 'Run Agents'}
          </Button>
        </Box>
      </Box>

      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          {/* Metrics Summary */}
          {metrics && (
            <Card sx={{ mb: 2 }}>
              <CardContent>
                <Typography variant="subtitle2" gutterBottom>📊 Agent Activity</Typography>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">Total Executions</Typography>
                    <Typography variant="h6">{metrics.totalExecutions}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">Successful Fixes</Typography>
                    <Typography variant="h6" color="success.main">{metrics.successfulFixes}</Typography>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          )}

          {/* Agent Results */}
          {agentResults.length === 0 ? (
            <Alert severity="info">
              No agent results available. Click "Run Agents" to analyze this component.
            </Alert>
          ) : (
            agentResults.map((result, index) => (
              <Accordion key={index} sx={{ mb: 1 }}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                    {getStatusIcon(result.status)}
                    <Typography variant="subtitle2" sx={{ flexGrow: 1 }}>
                      {result.agent}
                    </Typography>
                    <Chip 
                      label={result.action} 
                      size="small" 
                      color={getStatusColor(result.status) as any} 
                      variant="outlined"
                    />
                    {result.canAutofix && (
                      <Tooltip title="Auto-fix available">
                        <AutoFixHighIcon color="primary" />
                      </Tooltip>
                    )}
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  <Box>
                    <Typography variant="body2" gutterBottom>
                      {result.result}
                    </Typography>
                    
                    {result.recommendation && (
                      <Alert severity="info" sx={{ mt: 1, mb: 1 }}>
                        <Typography variant="body2">
                          <strong>Recommendation:</strong> {result.recommendation}
                        </Typography>
                      </Alert>
                    )}
                    
                    {result.metadata && Object.keys(result.metadata).length > 0 && (
                      <Box sx={{ mt: 1 }}>
                        <Typography variant="caption" color="text.secondary">
                          Details:
                        </Typography>
                        <Box sx={{ mt: 0.5 }}>
                          {Object.entries(result.metadata).map(([key, value]) => (
                            <Chip
                              key={key}
                              label={`${key}: ${Array.isArray(value) ? value.length : value}`}
                              size="small"
                              variant="outlined"
                              sx={{ mr: 0.5, mb: 0.5 }}
                            />
                          ))}
                        </Box>
                      </Box>
                    )}
                    
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2 }}>
                      <Typography variant="caption" color="text.secondary">
                        {new Date(result.timestamp).toLocaleString()}
                      </Typography>
                      
                      {result.canAutofix && result.autofixAction && (
                        <Button
                          variant="outlined"
                          size="small"
                          onClick={() => handleAutofix(result.agent, result.autofixAction!)}
                          startIcon={<AutoFixHighIcon />}
                        >
                          Auto-fix
                        </Button>
                      )}
                    </Box>
                  </Box>
                </AccordionDetails>
              </Accordion>
            ))
          )}

          {/* Summary */}
          {agentResults.length > 0 && (
            <Card sx={{ mt: 2 }}>
              <CardContent>
                <Typography variant="subtitle2" gutterBottom>📋 Analysis Summary</Typography>
                <Typography variant="body2" color="text.secondary">
                  {agentResults.length} agents analyzed • {' '}
                  {agentResults.filter(r => r.status === 'success').length} successful • {' '}
                  {agentResults.filter(r => r.status === 'warning').length} warnings • {' '}
                  {agentResults.filter(r => r.status === 'error').length} errors • {' '}
                  {agentResults.filter(r => r.canAutofix).length} auto-fixable
                </Typography>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </Box>
  );
};

export default ComponentAgentPanel; 