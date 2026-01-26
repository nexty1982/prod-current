import React, { useState } from 'react';
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Card,
  CardContent,
  Grid,
} from '@mui/material';
import { TableThemeSelector } from './TableThemeSelector';
import '../../styles/table-themes.css';

// Sample data for demonstration
const sampleRecords = [
  {
    id: '1',
    firstName: 'John',
    lastName: 'Doe',
    dateOfBirth: '1990-05-15',
    dateOfBaptism: '1990-06-20',
    placeOfBirth: 'New York, NY',
    placeOfBaptism: 'St. Nicholas Cathedral',
    fatherName: 'Michael Doe',
    motherName: 'Sarah Doe',
    godparentNames: 'Peter Smith, Mary Johnson',
    priest: 'Rev. James Parsells',
    registryNumber: 'B001',
  },
  {
    id: '2',
    firstName: 'Jane',
    lastName: 'Smith',
    dateOfBirth: '1988-12-03',
    dateOfBaptism: '1989-01-10',
    placeOfBirth: 'Boston, MA',
    placeOfBaptism: 'Holy Trinity Church',
    fatherName: 'Robert Smith',
    motherName: 'Elizabeth Smith',
    godparentNames: 'David Wilson, Anna Brown',
    priest: 'Rev. Michael Johnson',
    registryNumber: 'B002',
  },
  {
    id: '3',
    firstName: 'Michael',
    lastName: 'Johnson',
    dateOfBirth: '1992-08-22',
    dateOfBaptism: '1992-09-15',
    placeOfBirth: 'Chicago, IL',
    placeOfBaptism: 'St. George Church',
    fatherName: 'William Johnson',
    motherName: 'Patricia Johnson',
    godparentNames: 'Thomas Davis, Helen Wilson',
    priest: 'Rev. Sarah Williams',
    registryNumber: 'B003',
  },
  {
    id: '4',
    firstName: 'Emily',
    lastName: 'Brown',
    dateOfBirth: '1995-03-10',
    dateOfBaptism: '1995-04-05',
    placeOfBirth: 'Los Angeles, CA',
    placeOfBaptism: 'St. Mary Church',
    fatherName: 'Christopher Brown',
    motherName: 'Jennifer Brown',
    godparentNames: 'Andrew Miller, Lisa Garcia',
    priest: 'Rev. Robert Davis',
    registryNumber: 'B004',
  },
  {
    id: '5',
    firstName: 'David',
    lastName: 'Wilson',
    dateOfBirth: '1987-11-18',
    dateOfBaptism: '1987-12-25',
    placeOfBirth: 'Philadelphia, PA',
    placeOfBaptism: 'St. Andrew Church',
    fatherName: 'Richard Wilson',
    motherName: 'Margaret Wilson',
    godparentNames: 'Joseph Taylor, Catherine Anderson',
    priest: 'Rev. Elizabeth Brown',
    registryNumber: 'B005',
  },
];

const TableThemeDemo: React.FC = () => {
  const [selectedTheme, setSelectedTheme] = useState<string>('table-theme-ocean-serenity');

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <Box sx={{ p: 3, maxWidth: 1200, mx: 'auto' }}>
      <Typography variant="h4" sx={{ mb: 3, textAlign: 'center', fontWeight: 'bold' }}>
        Beautiful Table Themes Demo
      </Typography>
      
      <Typography variant="body1" sx={{ mb: 4, textAlign: 'center', color: 'text.secondary' }}>
        Experience 5 stunning themes for your normal chart view tables. Each theme provides a unique visual experience
        while maintaining excellent readability and professional appearance.
      </Typography>

      {/* Theme Selector */}
      <Card sx={{ mb: 3, p: 2 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
            <Typography variant="h6">Select Table Theme:</Typography>
            <TableThemeSelector
              selectedTheme={selectedTheme}
              onThemeChange={setSelectedTheme}
              variant="dropdown"
              size="medium"
              showLabel={false}
            />
          </Box>
        </CardContent>
      </Card>

      {/* Sample Table */}
      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ p: 0 }}>
          <Typography variant="h6" sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
            Baptism Records - Sample Data
          </Typography>
          
          <TableContainer className={selectedTheme} sx={{ maxHeight: 600 }}>
            <Table stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell>Registry #</TableCell>
                  <TableCell>First Name</TableCell>
                  <TableCell>Last Name</TableCell>
                  <TableCell>Birth Date</TableCell>
                  <TableCell>Baptism Date</TableCell>
                  <TableCell>Birth Place</TableCell>
                  <TableCell>Baptism Place</TableCell>
                  <TableCell>Father</TableCell>
                  <TableCell>Mother</TableCell>
                  <TableCell>Godparents</TableCell>
                  <TableCell>Priest</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {sampleRecords.map((record) => (
                  <TableRow key={record.id} hover>
                    <TableCell sx={{ fontWeight: 'bold' }}>{record.registryNumber}</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>{record.firstName}</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>{record.lastName}</TableCell>
                    <TableCell>{formatDate(record.dateOfBirth)}</TableCell>
                    <TableCell>{formatDate(record.dateOfBaptism)}</TableCell>
                    <TableCell>{record.placeOfBirth}</TableCell>
                    <TableCell>{record.placeOfBaptism}</TableCell>
                    <TableCell>{record.fatherName}</TableCell>
                    <TableCell>{record.motherName}</TableCell>
                    <TableCell>{record.godparentNames}</TableCell>
                    <TableCell>{record.priest}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Theme Information */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Theme Features
              </Typography>
              <Box component="ul" sx={{ pl: 2 }}>
                <Typography component="li" variant="body2" sx={{ mb: 1 }}>
                  <strong>Ocean Serenity:</strong> Clean and professional blue gradient theme
                </Typography>
                <Typography component="li" variant="body2" sx={{ mb: 1 }}>
                  <strong>Forest Harmony:</strong> Natural and calming green gradient theme
                </Typography>
                <Typography component="li" variant="body2" sx={{ mb: 1 }}>
                  <strong>Sunset Warmth:</strong> Warm and inviting orange gradient theme
                </Typography>
                <Typography component="li" variant="body2" sx={{ mb: 1 }}>
                  <strong>Royal Elegance:</strong> Elegant and sophisticated purple gradient theme
                </Typography>
                <Typography component="li" variant="body2" sx={{ mb: 1 }}>
                  <strong>Midnight Sophistication:</strong> Modern and sleek dark theme
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Enhanced Features
              </Typography>
              <Box component="ul" sx={{ pl: 2 }}>
                <Typography component="li" variant="body2" sx={{ mb: 1 }}>
                  Smooth hover animations and transitions
                </Typography>
                <Typography component="li" variant="body2" sx={{ mb: 1 }}>
                  Custom scrollbars matching theme colors
                </Typography>
                <Typography component="li" variant="body2" sx={{ mb: 1 }}>
                  Responsive design for all screen sizes
                </Typography>
                <Typography component="li" variant="body2" sx={{ mb: 1 }}>
                  Professional typography and spacing
                </Typography>
                <Typography component="li" variant="body2" sx={{ mb: 1 }}>
                  Enhanced visual hierarchy and contrast
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default TableThemeDemo; 