import React, { useState } from 'react';
import {
  Box,
  Button,
  ButtonGroup,
} from '@mui/material';
import {
  Add as AddIcon,
  Upload as UploadIcon,
} from '@mui/icons-material';
import AddRecordModal from './AddRecordModal';
import ImportRecordsModal from './ImportRecordsModal';

interface RecordsActionButtonsProps {
  onRecordCreated?: () => void;
  onRecordsImported?: () => void;
}

export default function RecordsActionButtons({
  onRecordCreated,
  onRecordsImported,
}: RecordsActionButtonsProps) {
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);

  const handleRecordCreated = () => {
    setAddModalOpen(false);
    onRecordCreated?.();
  };

  const handleRecordsImported = () => {
    setImportModalOpen(false);
    onRecordsImported?.();
  };

  return (
    <Box>
      <ButtonGroup variant="contained" aria-label="records actions">
        <Button
          startIcon={<AddIcon />}
          onClick={() => setAddModalOpen(true)}
        >
          Add Record
        </Button>
        <Button
          startIcon={<UploadIcon />}
          onClick={() => setImportModalOpen(true)}
        >
          Import Records
        </Button>
      </ButtonGroup>

      {/* Add Record Modal */}
      <AddRecordModal
        open={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onRecordCreated={handleRecordCreated}
      />

      {/* Import Records Modal */}
      <ImportRecordsModal
        open={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        onRecordsImported={handleRecordsImported}
      />
    </Box>
  );
}
