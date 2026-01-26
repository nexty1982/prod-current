/**
 * Orthodox Metrics - Advanced Records Demo Page
 * Test page to demonstrate the new advanced record management system
 */

import React, { useState, useMemo } from 'react';
import {
  Box,
  Container,
  Typography,
  Tabs,
  Tab,
  Card,
  CardContent,
  Button,
  Alert,
  Chip,
} from '@mui/material';
import {
  Add as AddIcon,
  ViewList as ViewListIcon,
  Settings as SettingsIcon,
} from '@mui/icons-material';

// Temporarily comment out AG Grid to avoid build issues
// import { AGGridViewOnly } from '@/components/AGGridViewOnly';
import { 
  ChurchRecord, 
  RecordType,
  DEFAULT_PALETTES,
} from '@/types/church-records-advanced.types';
import { 
  createRecordWithFields,
  getRecordSchema,
} from '@/schemas/record-schemas';
import { devLogStateChange } from '@/utils/devLogger';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`advanced-records-tabpanel-${index}`}
      aria-labelledby={`advanced-records-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

/**
 * Advanced Records Demo Page Component
 */
const AdvancedRecordsDemo: React.FC = () => {
  const [currentTab, setCurrentTab] = useState(0);
  const [selectedRecordType, setSelectedRecordType] = useState<RecordType>('baptism');

  // Sample data for demonstration
  const sampleData = useMemo((): ChurchRecord[] => {
    const records: ChurchRecord[] = [];
    
    // Create sample baptism records
    for (let i = 1; i <= 3; i++) {
      const record = createRecordWithFields('baptism');
      record.id = `baptism-${i}`;
      record.metadata.status = i === 1 ? 'active' : 'draft';
      
      // Set some sample values
      record.fields.forEach(field => {
        switch (field.key) {
          case 'fullName':
            field.value = `Sample Baptism Person ${i}`;
            break;
          case 'birthDate':
            field.value = new Date(2020 + i, i, 15);
            break;
          case 'baptismDate':
            field.value = new Date(2021 + i, i, 20);
            break;
          case 'celebrant':
            field.value = `Father Sample ${i}`;
            break;
          case 'registrationNumber':
            field.value = `BAP-2024-${String(i).padStart(3, '0')}`;
            break;
        }
      });
      
      records.push(record);
    }
    
    // Create sample marriage records
    for (let i = 1; i <= 2; i++) {
      const record = createRecordWithFields('marriage');
      record.id = `marriage-${i}`;
      record.metadata.status = 'active';
      
      // Set some sample values
      record.fields.forEach(field => {
        switch (field.key) {
          case 'brideName':
            field.value = `Sample Bride ${i}`;
            break;
          case 'groomName':
            field.value = `Sample Groom ${i}`;
            break;
          case 'marriageDate':
            field.value = new Date(2023 + i, i + 5, 10);
            break;
          case 'celebrant':
            field.value = `Father Marriage ${i}`;
            break;
          case 'registrationNumber':
            field.value = `MAR-2024-${String(i).padStart(3, '0')}`;
            break;
        }
      });
      
      records.push(record);
    }
    
    // Create sample funeral records
    for (let i = 1; i <= 2; i++) {
      const record = createRecordWithFields('funeral');
      record.id = `funeral-${i}`;
      record.metadata.status = 'active';
      
      // Set some sample values
      record.fields.forEach(field => {
        switch (field.key) {
          case 'fullName':
            field.value = `Sample Deceased Person ${i}`;
            break;
          case 'deathDate':
            field.value = new Date(2024, i + 2, 5);
            break;
          case 'serviceDate':
            field.value = new Date(2024, i + 2, 8);
            break;
          case 'celebrant':
            field.value = `Father Funeral ${i}`;
            break;
          case 'registrationNumber':
            field.value = `FUN-2024-${String(i).padStart(3, '0')}`;
            break;
        }
      });
      
      records.push(record);
    }
    
    return records;
  }, []);

  // Filter data by record type
  const filteredData = useMemo(() => {
    return sampleData.filter(record => record.recordType === selectedRecordType);
  }, [sampleData, selectedRecordType]);

  // Handle tab change
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    const oldTab = currentTab;
    setCurrentTab(newValue);
    devLogStateChange('Advanced Records Tab Changed', oldTab, newValue, 'AdvancedRecordsDemo');
  };

  // Handle record type change
  const handleRecordTypeChange = (recordType: RecordType) => {
    const oldType = selectedRecordType;
    setSelectedRecordType(recordType);
    devLogStateChange('Record Type Changed', oldType, recordType, 'AdvancedRecordsDemo');
  };

  // Handle cell click
  const handleCellClick = (fieldKey: string, record: ChurchRecord) => {
    devLogStateChange('Record Cell Clicked', null, {
      fieldKey,
      recordId: record.id,
      recordType: record.recordType,
    }, 'AdvancedRecordsDemo');
    
    // TODO: Open field editor or color picker
    console.log('Cell clicked:', { fieldKey, record });
  };

  // Handle row select
  const handleRowSelect = (record: ChurchRecord) => {
    devLogStateChange('Record Row Selected', null, {
      recordId: record.id,
      recordType: record.recordType,
    }, 'AdvancedRecordsDemo');
    
    // TODO: Open record preview or editor
    console.log('Row selected:', record);
  };

  const recordTypeButtons = [
    { type: 'baptism' as RecordType, label: 'Baptism Records', color: 'primary' as const },
    { type: 'marriage' as RecordType, label: 'Marriage Records', color: 'secondary' as const },
    { type: 'funeral' as RecordType, label: 'Funeral Records', color: 'inherit' as const },
  ];

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Page Header */}
      <Box mb={4}>
        <Typography variant="h4" component="h1" gutterBottom>
          Advanced Records Management System
        </Typography>
        <Typography variant="body1" color="text.secondary" paragraph>
          Demonstration of Phase 8: Advanced Record Management with AG Grid, color customization, and editable templates.
        </Typography>
        
        <Alert severity="info" sx={{ mb: 3 }}>
          <strong>Phase 8.1 Complete:</strong> Shared record model and AG Grid view-only component implemented with sample data.
          Click on cells to test color customization (Phase 8.3). Select rows to test preview functionality (Phase 8.4).
        </Alert>
      </Box>

      {/* Tab Navigation */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={currentTab} onChange={handleTabChange}>
          <Tab 
            icon={<ViewListIcon />} 
            iconPosition="start"
            label="Records View" 
          />
          <Tab 
            icon={<SettingsIcon />} 
            iconPosition="start"
            label="Schema & Configuration" 
          />
        </Tabs>
      </Box>

      {/* Records View Tab */}
      <TabPanel value={currentTab} index={0}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {/* Record Type Selector */}
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Select Record Type
              </Typography>
              <Box display="flex" gap={2} flexWrap="wrap">
                {recordTypeButtons.map(({ type, label, color }) => (
                  <Button
                    key={type}
                    variant={selectedRecordType === type ? 'contained' : 'outlined'}
                    color={color}
                    onClick={() => handleRecordTypeChange(type)}
                    startIcon={<ViewListIcon />}
                  >
                    {label} ({sampleData.filter(r => r.recordType === type).length})
                  </Button>
                ))}
              </Box>
            </CardContent>
          </Card>

          {/* AG Grid Display */}
          <Card>
            <CardContent>
              <Box mb={2} display="flex" justifyContent="space-between" alignItems="center">
                <Typography variant="h6">
                  {selectedRecordType.charAt(0).toUpperCase() + selectedRecordType.slice(1)} Records
                </Typography>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => console.log('Add new record')}
                >
                  Add New {selectedRecordType.charAt(0).toUpperCase() + selectedRecordType.slice(1)}
                </Button>
              </Box>

              {/* Temporary placeholder for AG Grid */}
              <Box 
                sx={{ 
                  height: 500, 
                  border: '2px dashed #ccc', 
                  borderRadius: 2,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexDirection: 'column',
                  gap: 2,
                  backgroundColor: '#f9f9f9'
                }}
              >
                <ViewListIcon sx={{ fontSize: 64, color: '#999' }} />
                <Typography variant="h6" color="text.secondary">
                  AG Grid Component Placeholder
                </Typography>
                <Typography variant="body2" color="text.secondary" textAlign="center">
                  The AG Grid component will be displayed here once build issues are resolved.
                  <br />
                  Data available: {filteredData.length} {selectedRecordType} records
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  {filteredData.slice(0, 3).map((record, index) => (
                    <Chip 
                      key={record.id} 
                      label={`Record ${index + 1}: ${record.id}`} 
                      variant="outlined" 
                      size="small"
                    />
                  ))}
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Box>
      </TabPanel>

      {/* Schema & Configuration Tab */}
      <TabPanel value={currentTab} index={1}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
            {/* Schema Information */}
            <Box sx={{ flex: '1 1 300px', minWidth: '300px' }}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Record Schema: {selectedRecordType.charAt(0).toUpperCase() + selectedRecordType.slice(1)}
                  </Typography>
                  
                  {(() => {
                    const schema = getRecordSchema(selectedRecordType);
                    return (
                      <Box>
                        <Typography variant="body2" paragraph>
                          {schema.description}
                        </Typography>
                        
                        <Typography variant="subtitle2" gutterBottom>
                          Sections:
                        </Typography>
                        {schema.sections.map(section => (
                          <Box key={section.id} mb={2}>
                            <Typography variant="body2" fontWeight="bold">
                              {section.title}
                            </Typography>
                            <Box display="flex" gap={1} flexWrap="wrap" mt={1}>
                              {section.fields.map(fieldKey => (
                                <Chip 
                                  key={fieldKey}
                                  label={fieldKey}
                                  size="small"
                                  color={schema.requiredFields.includes(fieldKey) ? 'primary' : 'default'}
                                />
                              ))}
                            </Box>
                          </Box>
                        ))}
                      </Box>
                    );
                  })()}
                </CardContent>
              </Card>
            </Box>

            {/* Color Palettes */}
            <Box sx={{ flex: '1 1 300px', minWidth: '300px' }}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Available Color Palettes
                  </Typography>
                  
                  {DEFAULT_PALETTES.map(palette => (
                    <Box key={palette.id} mb={3}>
                      <Typography variant="subtitle2" gutterBottom>
                        {palette.name}
                      </Typography>
                      <Box display="flex" gap={1} flexWrap="wrap">
                        {Object.entries(palette.colors).map(([name, color]) => (
                          <Box
                            key={name}
                            sx={{
                              width: 24,
                              height: 24,
                              backgroundColor: color,
                              borderRadius: 1,
                              border: '1px solid #ccc',
                              title: `${name}: ${color}`,
                            }}
                            title={`${name}: ${color}`}
                          />
                        ))}
                      </Box>
                    </Box>
                  ))}
                </CardContent>
              </Card>
            </Box>
          </Box>

          {/* Sample Record Data */}
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Sample Record Structure
              </Typography>
              <Box
                component="pre"
                sx={{
                  backgroundColor: '#f5f5f5',
                  padding: 2,
                  borderRadius: 1,
                  overflow: 'auto',
                  fontSize: '0.875rem',
                  maxHeight: 300,
                }}
              >
                {JSON.stringify(filteredData[0] || {}, null, 2)}
              </Box>
            </CardContent>
          </Card>
        </Box>
      </TabPanel>
    </Container>
  );
};

export default AdvancedRecordsDemo;
