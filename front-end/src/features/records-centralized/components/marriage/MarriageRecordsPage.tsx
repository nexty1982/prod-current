/**
 * Marriage Records Page Component
 * Standalone page component for managing marriage records
 * Uses BaptismRecordsPage with type=marriage URL parameter
 */

import React from 'react';
import { useSearchParams } from 'react-router-dom';
import BaptismRecordsPage from '../baptism/BaptismRecordsPage';

/**
 * Marriage Records Page - Wrapper that renders BaptismRecordsPage
 * The BaptismRecordsPage component reads the 'type' URL parameter to determine
 * which record type to display. This maintains separate routes while reusing logic.
 */
const MarriageRecordsPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const churchId = searchParams.get('church');
  
  // BaptismRecordsPage will read ?type=marriage from the URL
  // We ensure the type parameter is set by updating the URL if needed
  React.useEffect(() => {
    if (!searchParams.get('type')) {
      const newParams = new URLSearchParams(searchParams);
      newParams.set('type', 'marriage');
      window.history.replaceState({}, '', `${window.location.pathname}?${newParams.toString()}`);
    }
  }, [searchParams]);

  return <BaptismRecordsPage />;
};

export default MarriageRecordsPage;

