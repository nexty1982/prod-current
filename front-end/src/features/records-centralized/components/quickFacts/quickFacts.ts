/**
 * Quick Facts Dispatcher
 * Routes to the appropriate fact calculator based on record type
 */

import { RecordType, QuickFactsResult, QuickFactsOptions } from './types';
import { computeBaptismFacts } from './baptismFacts';
import { computeMarriageFacts } from './marriageFacts';
import { computeFuneralFacts } from './funeralFacts';

/**
 * Compute quick facts for a given record type and dataset
 * @param recordType - The type of records (baptism, marriage, funeral)
 * @param records - Array of record objects
 * @param options - Optional configuration
 * @returns QuickFactsResult with sections and facts
 */
export function computeQuickFacts(
  recordType: RecordType,
  records: any[],
  options: QuickFactsOptions = {}
): QuickFactsResult {
  if (!records || records.length === 0) {
    return {
      sections: [],
      isEmpty: true,
    };
  }

  switch (recordType) {
    case 'baptism':
      return computeBaptismFacts(records, options);
    case 'marriage':
      return computeMarriageFacts(records, options);
    case 'funeral':
      return computeFuneralFacts(records, options);
    default:
      return {
        sections: [],
        isEmpty: true,
      };
  }
}
