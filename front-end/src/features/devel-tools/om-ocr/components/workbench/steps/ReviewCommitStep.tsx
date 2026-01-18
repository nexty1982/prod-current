/**
 * ReviewCommitStep - Step 4: Review and commit to database
 * Extracted from ReviewFinalizeTab
 */

import React from 'react';
import { Box, Typography, Button, Stack } from '@mui/material';
import type { JobDetail } from '../../../types/inspection';

interface ReviewCommitStepProps {
  job: JobDetail;
  churchId: number;
  onBack: () => void;
}

const ReviewCommitStep: React.FC<ReviewCommitStepProps> = ({
  job,
  churchId,
  onBack,
}) => {
  // TODO: Extract review/commit logic from ReviewFinalizeTab
  // This is a placeholder - will integrate ReviewFinalizeTab content
  
  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        Review & Commit
      </Typography>
      <Typography variant="body2" color="text.secondary" paragraph>
        Review mapped fields and commit records to the database.
      </Typography>
      
      {/* TODO: Integrate ReviewFinalizeTab content here */}
      
      <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
        <Button variant="outlined" onClick={onBack}>
          Back
        </Button>
        <Button variant="contained" color="success">
          Commit to Database
        </Button>
      </Stack>
    </Box>
  );
};

export default ReviewCommitStep;

