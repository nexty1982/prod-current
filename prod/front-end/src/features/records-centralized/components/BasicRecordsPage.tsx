import React from 'react';
import { Box, Card, CardContent, Typography, Select, MenuItem, FormControl, InputLabel, TextField, Button, CircularProgress, Alert } from '@mui/material';
import { useRecordsData } from '../hooks/useRecordsData';

export default function BasicRecordsPage() {
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

  if (error) {
    return (
      <Box p={3}>
        <Alert severity="error">
          Error: {error}
        </Alert>
      </Box>
    );
  }

  return (
    <Box p={3}>
      <Typography variant="h4" gutterBottom>
        Records Browser
      </Typography>
      
      <Typography variant="subtitle2" color="textSecondary" gutterBottom>
        API: {apiName}
      </Typography>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box display="flex" gap={2} mb={2} alignItems="center">
            <FormControl size="small" sx={{ minWidth: 200 }}>
              <InputLabel>Table</InputLabel>
              <Select
                value={selectedTable}
                label="Table"
                onChange={(e) => actions.setSelectedTable(e.target.value)}
                disabled={loading}
              >
                {tables.map(table => (
                  <MenuItem key={table} value={table}>{table}</MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              size="small"
              label="Search"
              value={searchQuery}
              onChange={(e) => actions.setSearchQuery(e.target.value)}
              disabled={loading}
              sx={{ minWidth: 200 }}
            />

            <Button
              variant="outlined"
              onClick={actions.refresh}
              disabled={loading}
            >
              {loading ? <CircularProgress size={20} /> : 'Refresh'}
            </Button>
          </Box>

          {selectedTable && (
            <Typography variant="body2" color="textSecondary">
              Columns: {columns.join(', ')}
            </Typography>
          )}
        </CardContent>
      </Card>

      {selectedTable && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              {selectedTable} - Rows: {total}
            </Typography>

            {loading ? (
              <Box display="flex" justifyContent="center" p={3}>
                <CircularProgress />
              </Box>
            ) : (
              <>
                <Box sx={{ overflowX: 'auto', mb: 2 }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        {columns.map(col => (
                          <th key={col} style={{ padding: '8px', borderBottom: '1px solid #ddd', textAlign: 'left' }}>
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row, i) => (
                        <tr key={i}>
                          {columns.map(col => (
                            <td key={col} style={{ padding: '8px', borderBottom: '1px solid #eee' }}>
                              {row[col] ? String(row[col]) : '-'}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </Box>

                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Typography variant="body2">
                    Showing {offset + 1}-{Math.min(offset + limit, total)} of {total}
                  </Typography>

                  <Box display="flex" gap={2}>
                    <Button 
                      disabled={offset === 0} 
                      onClick={() => actions.setOffset(Math.max(offset - limit, 0))}
                      variant="outlined"
                      size="small"
                    >
                      Prev
                    </Button>
                    <Button 
                      disabled={offset + limit >= total} 
                      onClick={() => actions.setOffset(offset + limit)}
                      variant="outlined"
                      size="small"
                    >
                      Next
                    </Button>
                  </Box>
                </Box>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </Box>
  );
}