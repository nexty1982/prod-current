import React from 'react';
import { Box, Typography, Tab, Tabs, Button } from '@mui/material';
import { IconPlus } from '@tabler/icons-react';
import OCRPreviewTable from './OCRPreviewTableEnhanced';

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
      id={`record-tabpanel-${index}`}
      aria-labelledby={`record-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const OCRRecordsDemo: React.FC = () => {
  const [tabValue, setTabValue] = React.useState(0);

  // Sample baptism data
  const baptismData = [
    {
      id: 1,
      first_name: 'Μαρία',
      last_name: 'Παπαδόπουλος',
      date_of_birth: '2023-03-15',
      date_of_baptism: '2023-04-20',
      gender: 'Female',
      place_of_birth: 'Athens, Greece',
      sponsors_godparents: 'Γιάννης και Ελένη Κωστόπουλος',
      parents_names: 'Νίκος και Σοφία Παπαδόπουλος',
      clergy: 'Π. Δημήτριος Αντωνίου',
      parish_church: 'Ναός Αγίου Νικολάου',
      language: 'Greek',
      entry_type: 'Infant Baptism',
      notes_remarks: 'Emergency baptism due to health concerns',
      confidence_score: 92
    },
    {
      id: 2,
      first_name: 'John',
      last_name: 'Smith',
      date_of_birth: '1985-07-12',
      date_of_baptism: '2024-01-10',
      gender: 'Male',
      place_of_birth: 'Chicago, IL',
      sponsors_godparents: 'Michael and Anna Petrov',
      parents_names: 'Robert and Mary Smith',
      clergy: 'Fr. Peter Johnson',
      parish_church: 'Holy Trinity Orthodox Church',
      language: 'English',
      entry_type: 'Adult Convert',
      notes_remarks: 'Convert from Roman Catholicism',
      confidence_score: 87
    }
  ];

  // Sample marriage data
  const marriageData = [
    {
      id: 1,
      groom_full_name: 'Αλέξανδρος Γεωργίου',
      bride_full_name: 'Μαρία Κωνσταντίνου (maiden)',
      date_of_marriage: '2024-06-15',
      place_of_marriage: 'Καθεδρικός Ναός Αθηνών',
      clergy: 'Αρχιεπίσκοπος Ιερώνυμος',
      groom_parents: 'Γεώργιος και Ελένη Γεωργίου',
      bride_parents: 'Κωνσταντίνος και Αννα Κωνσταντίνου',
      witnesses: 'Νίκος Παπαδόπουλος (Κουμπάρος)',
      baptism_status: 'Both Orthodox',
      dispensation_noted: 'No',
      previous_marriages: 'None',
      language: 'Greek',
      notes_remarks: 'Traditional Greek Orthodox ceremony',
      confidence_score: 95
    }
  ];

  // Sample funeral data
  const funeralData = [
    {
      id: 1,
      deceased_full_name: 'Παναγιώτης Μιχαλόπουλος',
      date_of_death: '2024-02-28',
      date_of_funeral: '2024-03-02',
      place_of_death: 'Νοσοκομείο Αθηνών',
      place_of_burial: 'Α Νεκροταφείο Αθηνών, Τάφος 245',
      age_at_death: 78,
      clergy: 'Π. Κωνσταντίνος Παπαδόπουλος',
      family_next_of_kin: 'Μαρία Μιχαλοπούλου (σύζυγος), Νίκος Μιχαλόπουλος (γιος)',
      cause_of_death: 'Καρδιακή ανεπάρκεια',
      sacraments_received: 'All Sacraments',
      parish_community: 'Ναός Αγίας Σοφίας',
      language: 'Greek',
      notes_remarks: 'Veteran of Greek Army, buried with honors',
      confidence_score: 88
    }
  ];

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleSave = (editedRows: any[]) => {
    console.log('Saving edited rows:', editedRows);
    // Here you would typically send the data to your backend
  };

  const handleFieldsChange = (fields: any[]) => {
    console.log('Field configuration changed:', fields);
    // Here you would save the field configuration
  };

  return (
    <Box sx={{ width: '100%' }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" gutterBottom>
          Orthodox Church Records - OCR Preview
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Enhanced table with predefined Orthodox record fields, custom dropdowns, and comprehensive editing capabilities.
        </Typography>
      </Box>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={tabValue} onChange={handleTabChange} aria-label="record type tabs">
          <Tab label="Baptism Records" />
          <Tab label="Marriage Records" />
          <Tab label="Funeral Records" />
        </Tabs>
      </Box>

      <TabPanel value={tabValue} index={0}>
        <Box sx={{ mb: 2 }}>
          <Typography variant="h6" gutterBottom>
            Baptism Records ({baptismData.length})
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            Features: Date fields, gender dropdown, entry type selection, multilingual support.
          </Typography>
          <Button variant="outlined" startIcon={<IconPlus />} size="small" sx={{ mb: 2 }}>
            Add Baptism Record
          </Button>
        </Box>
        <OCRPreviewTable
          data={baptismData}
          recordType="baptism"
          onSave={handleSave}
          onFieldsChange={handleFieldsChange}
        />
      </TabPanel>

      <TabPanel value={tabValue} index={1}>
        <Box sx={{ mb: 2 }}>
          <Typography variant="h6" gutterBottom>
            Marriage Records ({marriageData.length})
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            Features: Separate groom/bride fields, baptism status dropdown, dispensation tracking.
          </Typography>
          <Button variant="outlined" startIcon={<IconPlus />} size="small" sx={{ mb: 2 }}>
            Add Marriage Record
          </Button>
        </Box>
        <OCRPreviewTable
          data={marriageData}
          recordType="marriage"
          onSave={handleSave}
          onFieldsChange={handleFieldsChange}
        />
      </TabPanel>

      <TabPanel value={tabValue} index={2}>
        <Box sx={{ mb: 2 }}>
          <Typography variant="h6" gutterBottom>
            Funeral Records ({funeralData.length})
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            Features: Death/funeral dates, age calculation, sacraments dropdown, burial location.
          </Typography>
          <Button variant="outlined" startIcon={<IconPlus />} size="small" sx={{ mb: 2 }}>
            Add Funeral Record
          </Button>
        </Box>
        <OCRPreviewTable
          data={funeralData}
          recordType="funeral"
          onSave={handleSave}
          onFieldsChange={handleFieldsChange}
        />
      </TabPanel>
    </Box>
  );
};

export default OCRRecordsDemo;
