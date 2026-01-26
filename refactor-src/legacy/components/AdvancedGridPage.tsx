import React from 'react';
import { AdvancedGridDialog } from './AdvancedGridDialog.tsx';

// Simple wrapper to render AdvancedGridDialog as a standalone page
const AdvancedGridPage: React.FC = () => {
  return (
    <AdvancedGridDialog
      open={true}
      onClose={() => window.history.back()}
      records={[]}
      recordType="baptism"
    />
  );
};

export default AdvancedGridPage;
