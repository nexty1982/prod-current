import React from 'react';
import {
  Box,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
  Alert,
  Link
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import WarningIcon from '@mui/icons-material/Warning';
import InfoIcon from '@mui/icons-material/Info';

interface PluginResult {
  pluginName: string;
  description: string;
  result: string;
  timestamp: string;
}

interface PluginResultsPanelProps {
  pluginResults?: PluginResult[];
  generatedDocPath?: string | null;
}

const PluginResultsPanel: React.FC<PluginResultsPanelProps> = ({
  pluginResults,
  generatedDocPath
}) => {
  if (!pluginResults || pluginResults.length === 0) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>
          🔍 Plugin Analysis
        </Typography>
        <Alert severity="info">
          No plugin results available. Save a component to run analysis.
        </Alert>
      </Box>
    );
  }

  const getResultIcon = (result: string) => {
    if (result.includes('✅')) return <CheckCircleIcon color="success" />;
    if (result.includes('❌')) return <ErrorIcon color="error" />;
    if (result.includes('⚠️')) return <WarningIcon color="warning" />;
    return <InfoIcon color="info" />;
  };

  const getResultColor = (result: string) => {
    if (result.includes('✅')) return 'success';
    if (result.includes('❌')) return 'error';
    if (result.includes('⚠️')) return 'warning';
    return 'info';
  };

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        🔍 Plugin Analysis
      </Typography>

      {/* Generated Documentation Link */}
      {generatedDocPath && (
        <Alert severity="success" sx={{ mb: 2 }}>
          <Typography variant="body2">
            📄 Documentation generated: 
            <Link href={generatedDocPath} target="_blank" sx={{ ml: 1 }}>
              View Documentation
            </Link>
          </Typography>
        </Alert>
      )}

      {/* Plugin Results */}
      {pluginResults.map((result, index) => (
        <Accordion key={index} sx={{ mb: 1 }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {getResultIcon(result.result)}
              <Typography variant="subtitle2">
                {result.pluginName}
              </Typography>
              <Chip
                label={result.description}
                size="small"
                color={getResultColor(result.result) as any}
                variant="outlined"
              />
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <Box>
              <Typography variant="body2" component="pre" sx={{ 
                whiteSpace: 'pre-wrap',
                fontFamily: 'monospace',
                fontSize: '0.875rem',
                backgroundColor: 'grey.50',
                p: 1,
                borderRadius: 1
              }}>
                {result.result}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                Analyzed at: {new Date(result.timestamp).toLocaleString()}
              </Typography>
            </Box>
          </AccordionDetails>
        </Accordion>
      ))}

      {/* Summary */}
      <Box sx={{ mt: 2, p: 2, backgroundColor: 'grey.50', borderRadius: 1 }}>
        <Typography variant="subtitle2" gutterBottom>
          📊 Analysis Summary
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {pluginResults.length} plugins analyzed
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {pluginResults.filter(r => r.result.includes('✅')).length} successful checks
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {pluginResults.filter(r => r.result.includes('❌')).length} issues found
        </Typography>
      </Box>
    </Box>
  );
};

export default PluginResultsPanel; 