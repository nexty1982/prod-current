import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Button,
  Alert,
  CircularProgress,
  Stack,
  Chip,
  Pagination,
  Paper
} from '@mui/material';
import { useRecordsData } from '../hooks/useRecordsData';

export default function CardsRecordsPage() {
  const { 
    tables, 
    selectedTable, 
    columns, 
    rows, 
    total, 
    loading, 
    error, 
    searchQuery, 
    limit, 
    offset, 
    actions,
    apiName 
  } = useRecordsData();

  const currentPage = Math.floor(offset / limit) + 1;
  const totalPages = Math.ceil(total / limit);

  const handlePageChange = (event: React.ChangeEvent<unknown>, page: number) => {
    actions.setOffset((page - 1) * limit);
  };

  if (error) {
    return (
      <Box p={3}>
        <Alert severity="error">
          Error: {error}
        </Alert>
      </Box>
    );
  }

  const renderRecordCard = (record: any, index: number) => {
    const mainFields = columns.slice(0, 4); // Show first 4 fields prominently
    const otherFields = columns.slice(4);   // Show rest in smaller text

    return (
      <Grid item xs={12} sm={6} md={4} lg={3} key={index}>
        <Card 
          sx={{ 
            height: '100%', 
            display: 'flex', 
            flexDirection: 'column',
            '&:hover': { 
              boxShadow: theme => theme.shadows[4],
              transform: 'translateY(-2px)',
              transition: 'all 0.2s ease-in-out'
            } 
          }}
        >
          <CardContent sx={{ flexGrow: 1 }}>
            {/* Main fields */}
            {mainFields.map(field => (
              <Box key={field} mb={1}>
                <Typography variant="caption" color="textSecondary" display="block">
                  {field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </Typography>
                <Typography variant="body2" fontWeight="medium">
                  {record[field] ? (
                    typeof record[field] === 'string' && record[field].match(/^\d{4}-\d{2}-\d{2}/) ? 
                      new Date(record[field]).toLocaleDateString() :
                      String(record[field])
                  ) : (
                    '—'
                  )}
                </Typography>
              </Box>
            ))}
            
            {/* Other fields (condensed) */}
            {otherFields.length > 0 && (
              <Box mt={2} pt={1} borderTop="1px solid #eee">
                <Typography variant="caption" color="textSecondary" gutterBottom>
                  Additional Details
                </Typography>
                {otherFields.map(field => record[field] && (
                  <Typography key={field} variant="caption" display="block" color="textSecondary">
                    <strong>{field.replace(/_/g, ' ')}: </strong>
                    {typeof record[field] === 'string' && record[field].match(/^\d{4}-\d{2}-\d{2}/) ? 
                      new Date(record[field]).toLocaleDateString() :
                      String(record[field])
                    }
                  </Typography>
                ))}
              </Box>
            )}
          </CardContent>
        </Card>
      </Grid>
    );
  };

  return (
    <Box p={3}>
      <Typography variant="h4" gutterBottom>
        Records Dashboard
      </Typography>
      
      <Paper sx={{ p: 3, mb: 3 }}>
        <Stack spacing={2}>
          <Box display="flex" alignItems="center" gap={2}>
            <Chip 
              label={`API: ${apiName}`} 
              color="primary" 
              variant="outlined" 
              size="small" 
            />
            <Chip 
              label={`Total: ${total} records`} 
              color="secondary" 
              variant="outlined" 
              size="small" 
            />
            {selectedTable && (
              <Chip 
                label={`Table: ${selectedTable}`} 
                color="info" 
                variant="filled" 
                size="small" 
              />
            )}
          </Box>

          <Box display="flex" gap={2} alignItems="center" flexWrap="wrap">
            <FormControl size="small" sx={{ minWidth: 200 }}>
              <InputLabel>Record Type</InputLabel>
              <Select
                value={selectedTable}
                label="Record Type"
                onChange={(e) => actions.setSelectedTable(e.target.value)}
                disabled={loading}
              >
                {tables.map(table => (
                  <MenuItem key={table} value={table}>
                    {table.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              size="small"
              label="Search Records"
              value={searchQuery}
              onChange={(e) => actions.setSearchQuery(e.target.value)}
              disabled={loading}
              sx={{ minWidth: 250 }}
              placeholder="Search across all fields..."
            />

            <Button
              variant="outlined"
              onClick={actions.refresh}
              disabled={loading}
              sx={{ height: 40 }}
            >
              {loading ? <CircularProgress size={20} /> : 'Refresh'}
            </Button>
          </Box>
        </Stack>
      </Paper>

      {selectedTable && (
        <>
          {loading ? (
            <Box display="flex" justifyContent="center" p={4}>
              <CircularProgress size={40} />
            </Box>
          ) : rows.length === 0 ? (
            <Box textAlign="center" p={4}>
              <Typography color="textSecondary" variant="h6">
                No records found
                {searchQuery && ` for "${searchQuery}"`}
              </Typography>
            </Box>
          ) : (
            <>
              <Grid container spacing={2}>
                {rows.map((record, index) => renderRecordCard(record, index))}
              </Grid>

              {totalPages > 1 && (
                <Box display="flex" justifyContent="center" mt={4}>
                  <Pagination
                    count={totalPages}
                    page={currentPage}
                    onChange={handlePageChange}
                    color="primary"
                    size="large"
                    showFirstButton
                    showLastButton
                  />
                </Box>
              )}
            </>
          )}
        </>
      )}
    </Box>
  );
}