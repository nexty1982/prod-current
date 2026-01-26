/**
 * Website Importer Validation Component
 * Pre-check validation system for website import configurations
 */

import React, { useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  Alert,
  CircularProgress,
  Stack,
  Chip,
  Divider,
  Paper,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  ExpandMore as ExpandMoreIcon,
  PlayArrow as PlayArrowIcon,
} from '@mui/icons-material';

export interface ValidationStage {
  stage: number;
  name: string;
  status: 'pending' | 'running' | 'passed' | 'failed';
  message?: string;
  details?: any;
}

export interface ValidationReport {
  overallStatus: 'pending' | 'running' | 'passed' | 'failed';
  stages: ValidationStage[];
  sampleItems?: any[];
  errors?: string[];
  warnings?: string[];
}

interface WebsiteImporterValidationProps {
  churchId: number;
  config: {
    urls: string[];
    parser_type: string;
    parser_config_json: any;
  };
  onValidationComplete?: (report: ValidationReport) => void;
}

const WebsiteImporterValidation: React.FC<WebsiteImporterValidationProps> = ({
  churchId,
  config,
  onValidationComplete,
}) => {
  const [validationReport, setValidationReport] = useState<ValidationReport | null>(null);
  const [isValidating, setIsValidating] = useState(false);

  const handleValidate = async () => {
    setIsValidating(true);
    setValidationReport({
      overallStatus: 'running',
      stages: [
        { stage: 0, name: 'Connectivity', status: 'running' },
        { stage: 1, name: 'Parse', status: 'pending' },
        { stage: 2, name: 'Mapping', status: 'pending' },
        { stage: 3, name: 'Dedup', status: 'pending' },
      ],
    });

    try {
      const response = await fetch(`/api/admin/churches/${churchId}/imports/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(config),
      });

      if (!response.ok) {
        throw new Error(`Validation failed: ${response.statusText}`);
      }

      const report: ValidationReport = await response.json();
      setValidationReport(report);
      if (onValidationComplete) {
        onValidationComplete(report);
      }
    } catch (error: any) {
      setValidationReport({
        overallStatus: 'failed',
        stages: [
          { stage: 0, name: 'Connectivity', status: 'failed', message: error.message },
          { stage: 1, name: 'Parse', status: 'pending' },
          { stage: 2, name: 'Mapping', status: 'pending' },
          { stage: 3, name: 'Dedup', status: 'pending' },
        ],
        errors: [error.message || 'Validation request failed'],
      });
    } finally {
      setIsValidating(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'passed':
        return <CheckCircleIcon color="success" />;
      case 'failed':
        return <ErrorIcon color="error" />;
      case 'running':
        return <CircularProgress size={20} />;
      default:
        return <WarningIcon color="warning" />;
    }
  };

  const getStatusColor = (status: string): 'default' | 'success' | 'error' | 'warning' => {
    switch (status) {
      case 'passed':
        return 'success';
      case 'failed':
        return 'error';
      case 'running':
        return 'warning';
      default:
        return 'default';
    }
  };

  const allStagesPassed = validationReport?.stages.every((s) => s.status === 'passed') ?? false;

  return (
    <Card>
      <CardContent>
        <Stack spacing={3}>
          <Box>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
              Configuration Validation
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Validate your import configuration before enabling auto-import or auto-commit.
            </Typography>
          </Box>

          <Button
            variant="contained"
            startIcon={isValidating ? <CircularProgress size={16} /> : <PlayArrowIcon />}
            onClick={handleValidate}
            disabled={isValidating}
            fullWidth
          >
            {isValidating ? 'Validating...' : 'Validate Configuration'}
          </Button>

          {validationReport && (
            <>
              <Divider />

              {/* Overall Status */}
              <Alert
                severity={
                  validationReport.overallStatus === 'passed'
                    ? 'success'
                    : validationReport.overallStatus === 'failed'
                    ? 'error'
                    : 'info'
                }
                icon={getStatusIcon(validationReport.overallStatus)}
              >
                <Typography variant="body2" fontWeight={600}>
                  {validationReport.overallStatus === 'passed'
                    ? 'All validation stages passed'
                    : validationReport.overallStatus === 'failed'
                    ? 'Validation failed'
                    : 'Validation in progress'}
                </Typography>
              </Alert>

              {/* Validation Stages */}
              <Box>
                <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>
                  Validation Stages
                </Typography>
                <Stack spacing={2}>
                  {validationReport.stages.map((stage) => (
                    <Paper key={stage.stage} variant="outlined" sx={{ p: 2 }}>
                      <Stack direction="row" spacing={2} alignItems="center">
                        {getStatusIcon(stage.status)}
                        <Box sx={{ flex: 1 }}>
                          <Stack direction="row" spacing={1} alignItems="center">
                            <Typography variant="body1" sx={{ fontWeight: 600 }}>
                              Stage {stage.stage}: {stage.name}
                            </Typography>
                            <Chip
                              label={stage.status}
                              size="small"
                              color={getStatusColor(stage.status)}
                            />
                          </Stack>
                          {stage.message && (
                            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                              {stage.message}
                            </Typography>
                          )}
                        </Box>
                      </Stack>
                    </Paper>
                  ))}
                </Stack>
              </Box>

              {/* Errors */}
              {validationReport.errors && validationReport.errors.length > 0 && (
                <Alert severity="error">
                  <Typography variant="subtitle2" gutterBottom>
                    Errors:
                  </Typography>
                  <ul style={{ margin: 0, paddingLeft: 20 }}>
                    {validationReport.errors.map((error, idx) => (
                      <li key={idx}>
                        <Typography variant="body2">{error}</Typography>
                      </li>
                    ))}
                  </ul>
                </Alert>
              )}

              {/* Warnings */}
              {validationReport.warnings && validationReport.warnings.length > 0 && (
                <Alert severity="warning">
                  <Typography variant="subtitle2" gutterBottom>
                    Warnings:
                  </Typography>
                  <ul style={{ margin: 0, paddingLeft: 20 }}>
                    {validationReport.warnings.map((warning, idx) => (
                      <li key={idx}>
                        <Typography variant="body2">{warning}</Typography>
                      </li>
                    ))}
                  </ul>
                </Alert>
              )}

              {/* Sample Items */}
              {validationReport.sampleItems && validationReport.sampleItems.length > 0 && (
                <Accordion>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                      Sample Parsed Items ({validationReport.sampleItems.length})
                    </Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Stack spacing={2}>
                      {validationReport.sampleItems.slice(0, 5).map((item, idx) => (
                        <Paper key={idx} variant="outlined" sx={{ p: 2 }}>
                          <pre style={{ margin: 0, fontSize: '0.75rem', overflow: 'auto' }}>
                            {JSON.stringify(item, null, 2)}
                          </pre>
                        </Paper>
                      ))}
                    </Stack>
                  </AccordionDetails>
                </Accordion>
              )}

              {/* Auto-commit Status */}
              {allStagesPassed && (
                <Alert severity="success">
                  <Typography variant="body2">
                    ✓ All validation stages passed. You can now enable auto-import.
                    <br />
                    Note: Auto-commit requires additional approval history thresholds.
                  </Typography>
                </Alert>
              )}
            </>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
};

export default WebsiteImporterValidation;
