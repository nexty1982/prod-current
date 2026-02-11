/**
 * Marriage Records Page
 * Thin wrapper around UnifiedRecordsPage with defaultRecordType='marriage'.
 * All record page logic lives in UnifiedRecordsPage — this is just a route entry point.
 */
import React from 'react';
import UnifiedRecordsPage from '@/features/records-centralized/components/records/UnifiedRecordsPage';

const MarriageRecordsPage: React.FC = () => {
  return <UnifiedRecordsPage defaultRecordType="marriage" />;
};

export default MarriageRecordsPage;
