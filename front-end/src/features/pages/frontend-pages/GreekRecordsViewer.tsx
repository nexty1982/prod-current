import React, { useState, useEffect } from 'react';
import { Box, Typography, CircularProgress, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper } from '@mui/material';

interface GreekBaptismRecord {
  first_name: string;
  last_name: string;
  birth_date: string;
  reception_date: string;
  birthplace: string;
  entry_type: string;
  sponsors: string;
  parents: string;
  clergy: string;
  church_id: number;
}

const GreekRecordsViewer: React.FC = () => {
  const [records, setRecords] = useState<GreekBaptismRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [htmlLoading, setHtmlLoading] = useState(true);

  useEffect(() => {
    // Load JSON records
    fetch('/greek_baptism_records.json')
      .then((response) => {
        if (!response.ok) {
          throw new Error('Failed to load records');
        }
        return response.json();
      })
      .then((data) => {
        setRecords(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  return (
    <Box sx={{ width: '100%', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* HTML File Display */}
      <Box
        sx={{
          width: '100%',
          height: '50vh',
          position: 'relative',
          borderBottom: '2px solid #2E0F46',
        }}
      >
        {htmlLoading && (
          <Box
            sx={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 2,
              zIndex: 1,
            }}
          >
            <CircularProgress />
            <Typography>Loading HTML file...</Typography>
          </Box>
        )}
        <iframe
          src="/greek_baptism_table_demo.html"
          onLoad={() => setHtmlLoading(false)}
          style={{
            width: '100%',
            height: '100%',
            border: 'none',
          }}
          title="Greek Baptism Table Demo"
        />
      </Box>

      {/* JSON Records Display */}
      <Box sx={{ width: '100%', padding: 3, flex: 1 }}>
        <Typography variant="h4" sx={{ mb: 3, color: '#2E0F46', fontWeight: 'bold' }}>
          Additional Baptism Records from JSON
        </Typography>

        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 4 }}>
            <CircularProgress />
            <Typography sx={{ ml: 2 }}>Loading records...</Typography>
          </Box>
        )}

        {error && (
          <Box sx={{ p: 3, bgcolor: 'error.light', borderRadius: 2 }}>
            <Typography color="error">Error loading records: {error}</Typography>
            <Typography variant="body2" sx={{ mt: 1 }}>
              Make sure greek_baptism_records.json exists in the public directory.
            </Typography>
          </Box>
        )}

        {!loading && !error && records.length > 0 && (
          <TableContainer component={Paper} sx={{ maxHeight: '50vh', overflow: 'auto' }}>
            <Table stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ bgcolor: '#2E0F46', color: 'white', fontWeight: 'bold' }}>
                    First Name
                  </TableCell>
                  <TableCell sx={{ bgcolor: '#2E0F46', color: 'white', fontWeight: 'bold' }}>
                    Last Name
                  </TableCell>
                  <TableCell sx={{ bgcolor: '#2E0F46', color: 'white', fontWeight: 'bold' }}>
                    Birth Date
                  </TableCell>
                  <TableCell sx={{ bgcolor: '#2E0F46', color: 'white', fontWeight: 'bold' }}>
                    Reception Date
                  </TableCell>
                  <TableCell sx={{ bgcolor: '#2E0F46', color: 'white', fontWeight: 'bold' }}>
                    Birthplace
                  </TableCell>
                  <TableCell sx={{ bgcolor: '#2E0F46', color: 'white', fontWeight: 'bold' }}>
                    Entry Type
                  </TableCell>
                  <TableCell sx={{ bgcolor: '#2E0F46', color: 'white', fontWeight: 'bold' }}>
                    Sponsors
                  </TableCell>
                  <TableCell sx={{ bgcolor: '#2E0F46', color: 'white', fontWeight: 'bold' }}>
                    Parents
                  </TableCell>
                  <TableCell sx={{ bgcolor: '#2E0F46', color: 'white', fontWeight: 'bold' }}>
                    Clergy
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {records.map((record, index) => (
                  <TableRow key={index} hover>
                    <TableCell>{record.first_name}</TableCell>
                    <TableCell>{record.last_name}</TableCell>
                    <TableCell>{record.birth_date}</TableCell>
                    <TableCell>{record.reception_date}</TableCell>
                    <TableCell>{record.birthplace}</TableCell>
                    <TableCell>{record.entry_type}</TableCell>
                    <TableCell>{record.sponsors}</TableCell>
                    <TableCell>{record.parents}</TableCell>
                    <TableCell>{record.clergy}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {!loading && !error && records.length === 0 && (
          <Typography variant="body1" sx={{ p: 3, textAlign: 'center' }}>
            No records found.
          </Typography>
        )}
      </Box>
    </Box>
  );
};

export default GreekRecordsViewer;

