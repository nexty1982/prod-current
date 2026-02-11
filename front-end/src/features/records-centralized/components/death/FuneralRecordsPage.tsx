/**
 * Funeral Records Page
 * Thin wrapper around UnifiedRecordsPage with defaultRecordType='funeral'.
 * All record page logic lives in UnifiedRecordsPage — this is just a route entry point.
 */
import React from 'react';
import UnifiedRecordsPage from '@/features/records-centralized/components/records/UnifiedRecordsPage';

const FuneralRecordsPage: React.FC = () => {
  return <UnifiedRecordsPage defaultRecordType="funeral" />;
};

export default FuneralRecordsPage;
