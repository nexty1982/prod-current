/**
 * Funeral Records Page Component
 * Standalone page component for managing funeral records
 * Uses BaptismRecordsPage with type=funeral URL parameter
 */

import React from 'react';
import { useSearchParams } from 'react-router-dom';
import BaptismRecordsPage from '../baptism/BaptismRecordsPage';

/**
 * Funeral Records Page - Wrapper that renders BaptismRecordsPage
 * The BaptismRecordsPage component reads the 'type' URL parameter to determine
 * which record type to display. This maintains separate routes while reusing logic.
 */
const FuneralRecordsPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const churchId = searchParams.get('church');
  
  // BaptismRecordsPage will read ?type=funeral from the URL
  // We ensure the type parameter is set by updating the URL if needed
  React.useEffect(() => {
    if (!searchParams.get('type')) {
      const newParams = new URLSearchParams(searchParams);
      newParams.set('type', 'funeral');
      window.history.replaceState({}, '', `${window.location.pathname}?${newParams.toString()}`);
    }
  }, [searchParams]);

  return <BaptismRecordsPage />;
};

export default FuneralRecordsPage;

