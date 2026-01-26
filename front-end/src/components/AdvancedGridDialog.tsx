/**
 * AdvancedGridDialog Component
 * 
 * Dialog component for displaying advanced records grid with tabs for different record types.
 * This is a placeholder component that can be enhanced with full functionality.
 */

import React from 'react';
import { Dialog, DialogTitle, DialogContent, Box, Typography, CircularProgress } from '@mui/material';

interface AdvancedGridDialogProps {
  open: boolean;
  onClose: () => void;
  datasets?: {
    baptism?: any[];
    marriage?: any[];
    funeral?: any[];
  };
  counts?: {
    baptism?: number;
    marriage?: number;
    funeral?: number;
  };
  recordType?: string;
  loading?: boolean;
  records?: any[]; // Legacy prop for backward compatibility
}

const AdvancedGridDialog: React.FC<AdvancedGridDialogProps> = ({
  open,
  onClose,
  datasets,
  counts,
  recordType = 'baptism',
  loading = false,
  records = []
}) => {
  const displayRecords = datasets?.[recordType as keyof typeof datasets] || records;
  const recordCount = counts?.[recordType as keyof typeof counts] || records.length;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>
        Records Grid - {recordType.charAt(0).toUpperCase() + recordType.slice(1)}
      </DialogTitle>
      <DialogContent>
        {loading ? (
          <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
            <CircularProgress />
          </Box>
        ) : (
          <Box>
            <Typography variant="body1" gutterBottom>
              Total Records: {recordCount}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {displayRecords.length > 0 
                ? `Displaying ${displayRecords.length} records`
                : 'No records found'}
            </Typography>
            {/* TODO: Add actual grid/table component here when available */}
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default AdvancedGridDialog;
export { AdvancedGridDialog };
