import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Alert,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel
} from '@mui/material';
import {
  IconAlertTriangle,
  IconBug,
  IconInfoCircle,
  IconRefresh,
  IconFilter
} from '@tabler/icons-react';

interface ErrorEntry {
  id: number;
  timestamp: string;
  level: 'error' | 'warning' | 'info';
  component: string;
  message: string;
  stack?: string;
  frequency: number;
  lastSeen: string;
}

interface ErrorSummary {
  total: number;
  byLevel: {
    error: number;
    warning: number;
    info: number;
  };
  lastHour: number;
}

const ErrorBoard: React.FC = () => {
  const [errors, setErrors] = useState<ErrorEntry[]>([]);
  const [summary, setSummary] = useState<ErrorSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'error' | 'warning' | 'info'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const loadErrors = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/om-os/errors', {
        credentials: 'include'
      });
      const result = await response.json();
      
      if (result.success) {
        setErrors(result.data.errors);
        setSummary(result.data.summary);
      }
    } catch (error) {
      console.error('Failed to load errors:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadErrors();
    // Refresh every 30 seconds
    const interval = setInterval(loadErrors, 30000);
    return () => clearInterval(interval);
  }, []);

  const filteredErrors = errors.filter(error => {
    const matchesLevel = filter === 'all' || error.level === filter;
    const matchesSearch = searchTerm === '' || 
      error.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
      error.component.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesLevel && matchesSearch;
  });

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'error': return 'error';
      case 'warning': return 'warning';
      case 'info': return 'info';
      default: return 'default';
    }
  };

  const getLevelIcon = (level: string) => {
    switch (level) {
      case 'error': return <IconBug size={20} />;
      case 'warning': return <IconAlertTriangle size={20} />;
      case 'info': return <IconInfoCircle size={20} />;
      default: return null;
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  return (
    <Box sx={{ p: 3 }}>
      <Paper sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <IconBug size={32} style={{ marginRight: 16 }} />
            <Typography variant="h4" component="h1">
              Error Board
            </Typography>
          </Box>
          <Button
            variant="outlined"
            startIcon={<IconRefresh />}
            onClick={loadErrors}
            disabled={loading}
          >
            Refresh
          </Button>
        </Box>

        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          Monitor development, runtime, and build errors across the OrthodoxMetrics platform. 
          Errors are grouped by frequency and component for efficient debugging.
        </Typography>

        {/* Summary Cards */}
        {summary && (
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={6} md={3}>
              <Card variant="outlined">
                <CardContent sx={{ textAlign: 'center', py: 2 }}>
                  <Typography variant="h5" color="text.primary">
                    {summary.total}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Total Errors
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={6} md={3}>
              <Card variant="outlined">
                <CardContent sx={{ textAlign: 'center', py: 2 }}>
                  <Typography variant="h5" color="error.main">
                    {summary.byLevel.error}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Critical Errors
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={6} md={3}>
              <Card variant="outlined">
                <CardContent sx={{ textAlign: 'center', py: 2 }}>
                  <Typography variant="h5" color="warning.main">
                    {summary.byLevel.warning}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Warnings
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={6} md={3}>
              <Card variant="outlined">
                <CardContent sx={{ textAlign: 'center', py: 2 }}>
                  <Typography variant="h5" color="primary.main">
                    {summary.lastHour}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Last Hour
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}

        {/* Filters */}
        <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
          <TextField
            label="Search Errors"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by message or component..."
            sx={{ minWidth: '300px' }}
          />
          
          <FormControl sx={{ minWidth: '150px' }}>
            <InputLabel>Filter by Level</InputLabel>
            <Select
              value={filter}
              label="Filter by Level"
              onChange={(e) => setFilter(e.target.value as any)}
            >
              <MenuItem value="all">All Levels</MenuItem>
              <MenuItem value="error">Errors Only</MenuItem>
              <MenuItem value="warning">Warnings Only</MenuItem>
              <MenuItem value="info">Info Only</MenuItem>
            </Select>
          </FormControl>
        </Box>

        {/* Errors Table */}
        {filteredErrors.length > 0 ? (
          <TableContainer component={Paper} variant="outlined">
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Level</TableCell>
                  <TableCell>Component</TableCell>
                  <TableCell>Message</TableCell>
                  <TableCell>Frequency</TableCell>
                  <TableCell>Last Seen</TableCell>
                  <TableCell>First Occurred</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredErrors.map((error) => (
                  <TableRow key={error.id} hover>
                    <TableCell>
                      <Chip
                        label={error.level}
                        color={getLevelColor(error.level) as any}
                        size="small"
                        icon={getLevelIcon(error.level)}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                        {error.component}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ maxWidth: '400px' }}>
                        {error.message}
                      </Typography>
                      {error.stack && (
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                          Stack available
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={error.frequency} 
                        size="small" 
                        color={error.frequency > 5 ? 'error' : error.frequency > 2 ? 'warning' : 'default'}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {formatTimestamp(error.lastSeen)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {formatTimestamp(error.timestamp)}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        ) : (
          <Alert severity="info">
            {searchTerm || filter !== 'all' 
              ? 'No errors match your current filters.' 
              : 'No errors found. System is running smoothly! 🎉'
            }
          </Alert>
        )}

        {/* Info Alert */}
        <Alert severity="info" sx={{ mt: 3 }}>
          <Typography variant="body2">
            <strong>Error Ledger Integration:</strong> Errors are automatically logged to <code>logs/error-ledger.ndjson</code> 
            and grouped by frequency for efficient debugging. This board refreshes every 30 seconds.
          </Typography>
        </Alert>
      </Paper>
    </Box>
  );
};

export default ErrorBoard;