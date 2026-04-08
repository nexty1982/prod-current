import React from 'react';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Typography,
} from '@mui/material';
import { Download as DownloadIcon } from '@mui/icons-material';

interface ExportTemplateDialogProps {
  open: boolean;
  onClose: () => void;
  onExport: () => void;
  exporting: boolean;
  tableName: string;
  exportLanguage: string;
  exportOverwrite: boolean;
  setExportOverwrite: (value: boolean) => void;
  getRecordType: (table: string) => string;
}

const ExportTemplateDialog: React.FC<ExportTemplateDialogProps> = ({
  open,
  onClose,
  onExport,
  exporting,
  tableName,
  exportLanguage,
  exportOverwrite,
  setExportOverwrite,
  getRecordType,
}) => {
  const langName = exportLanguage === 'en' ? 'English' :
    exportLanguage === 'gr' ? 'Greek' :
    exportLanguage === 'ru' ? 'Russian' :
    exportLanguage === 'ro' ? 'Romanian' :
    exportLanguage === 'ka' ? 'Georgian' : exportLanguage.toUpperCase();

  const recordType = getRecordType(tableName);

  return (
    <Dialog open={open} onClose={() => !exporting && onClose()} maxWidth="sm" fullWidth>
      <DialogTitle>Export to Template</DialogTitle>
      <DialogContent>
        <Box sx={{ pt: 2 }}>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            This will create or update a global template from the current table schema and field mapper configuration.
          </Typography>

          <Box sx={{ mt: 3, mb: 2 }}>
            <Typography variant="subtitle2" gutterBottom>Template Details:</Typography>
            <Typography variant="body2">
              <strong>Table:</strong> {tableName}
            </Typography>
            <Typography variant="body2">
              <strong>Language:</strong> {exportLanguage}
            </Typography>
            <Typography variant="body2">
              <strong>Template Slug:</strong> {exportLanguage}_{tableName}
            </Typography>
            <Typography variant="body2">
              <strong>Template Name:</strong> {langName} {recordType.charAt(0).toUpperCase() + recordType.slice(1)} Records
            </Typography>
          </Box>

          <FormControlLabel
            control={
              <Checkbox
                checked={exportOverwrite}
                onChange={(e) => setExportOverwrite(e.target.checked)}
                disabled={exporting}
              />
            }
            label="Overwrite existing template if it exists"
          />

          <Alert severity="warning" sx={{ mt: 2 }}>
            <Typography variant="body2">
              <strong>Warning:</strong> This will create a global template available to all churches.
              Only export standardized, production-ready configurations. Church-specific customizations should not be exported.
            </Typography>
          </Alert>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={exporting}>
          Cancel
        </Button>
        <Button
          onClick={onExport}
          variant="contained"
          disabled={exporting}
          startIcon={exporting ? <CircularProgress size={16} /> : <DownloadIcon />}
        >
          {exporting ? 'Exporting...' : 'Export Template'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ExportTemplateDialog;
