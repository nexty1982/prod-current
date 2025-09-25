import React from 'react';
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TextField,
  Button,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  Card,
  CardContent,
  Stack,
  Chip
} from '@mui/material';
import { useRecordsData } from '../hooks/useRecordsData';

export default function ModernRecordsPage() {
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

  const displayRows = rows.slice(0, limit);

  const handleChangePage = (event: unknown, newPage: number) => {
    actions.setOffset(newPage * limit);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newLimit = parseInt(event.target.value, 10);
    actions.setLimit(newLimit);
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

  return (
    <Box p={3}>
      <Typography variant="h4" gutterBottom>
        Records Management
      </Typography>
      
      <Card sx={{ mb: 3 }}>
        <CardContent>
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
        </CardContent>
      </Card>

      {selectedTable && (
        <Paper>
          <TableContainer sx={{ maxHeight: 600 }}>
            <Table stickyHeader>
              <TableHead>
                <TableRow>
                  {columns.map(column => (
                    <TableCell key={column} sx={{ fontWeight: 'bold' }}>
                      {column.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={columns.length} align="center" sx={{ py: 4 }}>
                      <CircularProgress />
                    </TableCell>
                  </TableRow>
                ) : displayRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={columns.length} align="center" sx={{ py: 4 }}>
                      <Typography color="textSecondary">
                        No records found
                        {searchQuery && ` for "${searchQuery}"`}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  displayRows.map((row, index) => (
                    <TableRow key={index} hover>
                      {columns.map(column => (
                        <TableCell key={column}>
                          {row[column] ? (
                            typeof row[column] === 'string' && row[column].match(/^\d{4}-\d{2}-\d{2}/) ? 
                              new Date(row[column]).toLocaleDateString() :
                              String(row[column])
                          ) : (
                            <Typography color="textSecondary" variant="body2">
                              —
                            </Typography>
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>

          <TablePagination
            component="div"
            count={total}
            page={Math.floor(offset / limit)}
            onPageChange={handleChangePage}
            rowsPerPage={limit}
            onRowsPerPageChange={handleChangeRowsPerPage}
            rowsPerPageOptions={[10, 25, 50, 100]}
            showFirstButton
            showLastButton
          />
        </Paper>
      )}
    </Box>
  );
}