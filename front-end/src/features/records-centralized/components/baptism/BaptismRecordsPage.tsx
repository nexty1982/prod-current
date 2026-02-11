/**
 * Baptism Records Page
 * Thin wrapper around UnifiedRecordsPage with defaultRecordType='baptism'.
 * All record page logic lives in UnifiedRecordsPage — this is just a route entry point.
 */
import React from 'react';
import UnifiedRecordsPage from '@/features/records-centralized/components/records/UnifiedRecordsPage';

const BaptismRecordsPage: React.FC = () => {
  return <UnifiedRecordsPage defaultRecordType="baptism" />;
};

export default BaptismRecordsPage;
