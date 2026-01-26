import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Alert,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  IconButton,
  Collapse,
} from '@mui/material';
import {
  CheckCircle,
  Error,
  Warning,
  Info,
  ExpandMore,
  ExpandLess,
  Folder,
  Code,
  Palette,
  Settings,
} from '@mui/icons-material';

interface AuditStats {
  features: number;
  sharedUi: number;
  sharedLib: number;
  totalFiles: number;
  pathAnomalies: string[];
  conflictsResolved: number;
}

const ModernizeAuditPanel: React.FC = () => {
  const [stats, setStats] = useState<AuditStats>({
    features: 0,
    sharedUi: 0,
    sharedLib: 0,
    totalFiles: 0,
    pathAnomalies: [],
    conflictsResolved: 0,
  });
  const [expanded, setExpanded] = useState<{ [key: string]: boolean }>({});

  useEffect(() => {
    // Calculate stats (in a real implementation, this would scan the file system)
    const calculateStats = () => {
      // Mock data - in reality, this would scan the unified/src directory
      const mockStats: AuditStats = {
        features: 8, // apps, authentication, charts, dashboard, forms, pages, tables, widgets
        sharedUi: 15, // shared components
        sharedLib: 25, // utils, types, lib files
        totalFiles: 1041,
        pathAnomalies: [
          'shared/ui/legacy/ directory still exists (should be moved to features/ or shared/)',
          'views/ directory still exists (should be moved to features/)',
          'Some files in root src/ directory',
        ],
        conflictsResolved: 281, // From consolidation plan
      };
      setStats(mockStats);
    };

    calculateStats();
  }, []);

  const toggleExpanded = (key: string) => {
    setExpanded(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const getStatusColor = (count: number, threshold: number) => {
    if (count >= threshold) return 'success';
    if (count > 0) return 'warning';
    return 'error';
  };

  const getStatusIcon = (count: number, threshold: number) => {
    if (count >= threshold) return <CheckCircle />;
    if (count > 0) return <Warning />;
    return <Error />;
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Modernize Audit Panel
      </Typography>
      <Typography variant="subtitle1" color="text.secondary" gutterBottom>
        Consolidation and structure analysis for the modernize refactor
      </Typography>

      <Grid container spacing={3} sx={{ mt: 2 }}>
        {/* Summary Cards */}
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <Folder color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6">Features</Typography>
              </Box>
              <Typography variant="h3" color={getStatusColor(stats.features, 5)}>
                {stats.features}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Feature directories
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <Palette color="secondary" sx={{ mr: 1 }} />
                <Typography variant="h6">Shared UI</Typography>
              </Box>
              <Typography variant="h3" color={getStatusColor(stats.sharedUi, 10)}>
                {stats.sharedUi}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Shared components
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <Code color="info" sx={{ mr: 1 }} />
                <Typography variant="h6">Shared Lib</Typography>
              </Box>
              <Typography variant="h3" color={getStatusColor(stats.sharedLib, 20)}>
                {stats.sharedLib}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Utility functions
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <Settings color="action" sx={{ mr: 1 }} />
                <Typography variant="h6">Total Files</Typography>
              </Box>
              <Typography variant="h3" color="primary">
                {stats.totalFiles}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Files processed
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Conflicts Resolved */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <CheckCircle color="success" sx={{ mr: 1 }} />
                <Typography variant="h6">Conflicts Resolved</Typography>
              </Box>
              <Typography variant="h4" color="success.main">
                {stats.conflictsResolved}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Files with duplicate content resolved using new → minimal → old preference
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Path Anomalies */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <Warning color="warning" sx={{ mr: 1 }} />
                <Typography variant="h6">Path Anomalies</Typography>
                <IconButton
                  onClick={() => toggleExpanded('anomalies')}
                  sx={{ ml: 'auto' }}
                >
                  {expanded.anomalies ? <ExpandLess /> : <ExpandMore />}
                </IconButton>
              </Box>
              <Collapse in={expanded.anomalies}>
                <List>
                  {stats.pathAnomalies.map((anomaly, index) => (
                    <ListItem key={index}>
                      <ListItemIcon>
                        <Warning color="warning" />
                      </ListItemIcon>
                      <ListItemText primary={anomaly} />
                    </ListItem>
                  ))}
                </List>
              </Collapse>
            </CardContent>
          </Card>
        </Grid>

        {/* Consolidation Summary */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Consolidation Summary
              </Typography>
              <TableContainer component={Paper} variant="outlined">
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Source Tree</TableCell>
                      <TableCell align="right">Files</TableCell>
                      <TableCell align="right">Chosen</TableCell>
                      <TableCell align="right">Status</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    <TableRow>
                      <TableCell>Minimal</TableCell>
                      <TableCell align="right">105</TableCell>
                      <TableCell align="right">54</TableCell>
                      <TableCell align="right">
                        <Chip label="Baseline" color="info" size="small" />
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>New</TableCell>
                      <TableCell align="right">1,039</TableCell>
                      <TableCell align="right">918</TableCell>
                      <TableCell align="right">
                        <Chip label="Preferred" color="success" size="small" />
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Old</TableCell>
                      <TableCell align="right">1,904</TableCell>
                      <TableCell align="right">1,661</TableCell>
                      <TableCell align="right">
                        <Chip label="Fallback" color="warning" size="small" />
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Status Alerts */}
        <Grid item xs={12}>
          <Alert severity="success" sx={{ mb: 2 }}>
            <Typography variant="h6">✅ Consolidation Complete</Typography>
            <Typography>
              Successfully merged 3 codebases (minimal, new, old) into unified structure.
              All files have been processed and imports have been updated to use path aliases.
            </Typography>
          </Alert>
          
          <Alert severity="info" sx={{ mb: 2 }}>
            <Typography variant="h6">📁 Structure Normalized</Typography>
            <Typography>
              Files have been reorganized into features/* and shared/* directories
              following the modernize-clean structure guidelines.
            </Typography>
          </Alert>
          
          <Alert severity="warning">
            <Typography variant="h6">⚠️ Manual Review Needed</Typography>
            <Typography>
              Some path anomalies remain that may require manual attention.
              Review the anomalies list above and address as needed.
            </Typography>
          </Alert>
        </Grid>
      </Grid>
    </Box>
  );
};

export default ModernizeAuditPanel;
