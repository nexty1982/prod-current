/**
 * Marriage Records Quick Facts Calculator
 */

import { QuickFactsResult, QuickFactsSection, QuickFact, QuickFactsOptions } from './types';

/**
 * Parse a date string to Date object, handling various formats
 */
function parseDate(dateStr: any): Date | null {
  if (!dateStr) return null;
  if (dateStr instanceof Date) return dateStr;
  if (typeof dateStr === 'string') {
    const parsed = new Date(dateStr);
    return isNaN(parsed.getTime()) ? null : parsed;
  }
  return null;
}

/**
 * Calculate age from date of birth
 */
function calculateAge(dob: Date | null, referenceDate: Date = new Date()): number | null {
  if (!dob) return null;
  const ageMs = referenceDate.getTime() - dob.getTime();
  const ageYears = ageMs / (1000 * 60 * 60 * 24 * 365.25);
  return Math.floor(ageYears);
}

/**
 * Get age gap band
 */
function getAgeGapBand(ageGap: number): string {
  if (ageGap <= 2) return '0–2 years';
  if (ageGap <= 5) return '3–5 years';
  if (ageGap <= 10) return '6–10 years';
  return '10+ years';
}

/**
 * Get records from last N months
 */
function getLastNMonthsRecords(records: any[], months: number): any[] {
  const cutoffDate = new Date();
  cutoffDate.setMonth(cutoffDate.getMonth() - months);
  return records.filter(record => {
    const marriageDate = parseDate(record.mdate || record.marriageDate || record.marriage_date);
    return marriageDate && marriageDate >= cutoffDate;
  });
}

/**
 * Compute quick facts for marriage records
 */
export function computeMarriageFacts(
  records: any[],
  options: QuickFactsOptions = {}
): QuickFactsResult {
  const sections: QuickFactsSection[] = [];
  
  // Total records
  const totalRecords = records.length;
  sections.push({
    title: 'Overview',
    facts: [
      { label: 'Total Records', value: totalRecords, highlight: true },
    ],
  });

  // Marriages per year
  const yearCounts: Record<number, number> = {};
  records.forEach(record => {
    const marriageDate = parseDate(record.mdate || record.marriageDate || record.marriage_date);
    if (marriageDate) {
      const year = marriageDate.getFullYear();
      yearCounts[year] = (yearCounts[year] || 0) + 1;
    }
  });

  const topYears = Object.entries(yearCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([year, count]) => ({ label: year, value: count }));

  if (topYears.length > 0) {
    sections.push({
      title: 'Top Years',
      facts: topYears,
    });
  }

  // Last 12 months vs prior 12 months
  const last12Months = getLastNMonthsRecords(records, 12);
  const prior12Months = getLastNMonthsRecords(records, 24).filter(record => {
    const marriageDate = parseDate(record.mdate || record.marriageDate || record.marriage_date);
    if (!marriageDate) return false;
    const cutoffDate = new Date();
    cutoffDate.setMonth(cutoffDate.getMonth() - 12);
    return marriageDate < cutoffDate;
  });
  
  const last12Count = last12Months.length;
  const prior12Count = prior12Months.length;
  const delta = last12Count - prior12Count;
  const deltaPercent = prior12Count > 0 ? ((delta / prior12Count) * 100) : (last12Count > 0 ? 100 : 0);

  sections.push({
    title: 'Recent Activity',
    facts: [
      { label: 'Last 12 Months', value: last12Count, highlight: true },
      { label: 'Prior 12 Months', value: prior12Count },
      {
        label: 'Change',
        value: `${delta >= 0 ? '+' : ''}${delta} (${deltaPercent >= 0 ? '+' : ''}${Math.round(deltaPercent)}%)`,
        highlight: Math.abs(deltaPercent) > 10,
      },
    ],
  });

  // Top clergy
  const clergyCounts: Record<string, number> = {};
  records.forEach(record => {
    const clergy = record.clergy || record.officiant || record.priest;
    if (clergy && typeof clergy === 'string' && clergy.trim()) {
      clergyCounts[clergy] = (clergyCounts[clergy] || 0) + 1;
    }
  });

  const topClergy = Object.entries(clergyCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([name, count]) => ({ label: name, value: count }));

  if (topClergy.length > 0) {
    sections.push({
      title: 'Top Clergy',
      facts: topClergy,
    });
  }

  // Data quality checks
  let missingMarriageDate = 0;
  records.forEach(record => {
    const marriageDate = parseDate(record.mdate || record.marriageDate || record.marriage_date);
    if (!marriageDate) {
      missingMarriageDate++;
    }
  });

  const dataQualityFacts: QuickFact[] = [];
  if (missingMarriageDate > 0) {
    dataQualityFacts.push({ label: 'Missing Marriage Date', value: missingMarriageDate });
  }

  // Age calculations (if DOB fields exist)
  const groomAges: number[] = [];
  const brideAges: number[] = [];
  const ageGaps: number[] = [];
  const ageGapBands: Record<string, number> = {
    '0–2 years': 0,
    '3–5 years': 0,
    '6–10 years': 0,
    '10+ years': 0,
  };

  records.forEach(record => {
    const marriageDate = parseDate(record.mdate || record.marriageDate || record.marriage_date);
    const groomDOB = parseDate(record.groom_dob || record.groomDob || record.groom_birth_date || record.groomBirthDate);
    const brideDOB = parseDate(record.bride_dob || record.brideDob || record.bride_birth_date || record.brideBirthDate);
    
    if (marriageDate && groomDOB) {
      const age = calculateAge(groomDOB, marriageDate);
      if (age !== null && age >= 0 && age <= 150) {
        groomAges.push(age);
      }
    }
    
    if (marriageDate && brideDOB) {
      const age = calculateAge(brideDOB, marriageDate);
      if (age !== null && age >= 0 && age <= 150) {
        brideAges.push(age);
      }
    }
    
    if (groomDOB && brideDOB) {
      const groomAge = calculateAge(groomDOB, marriageDate || new Date());
      const brideAge = calculateAge(brideDOB, marriageDate || new Date());
      if (groomAge !== null && brideAge !== null) {
        const gap = Math.abs(groomAge - brideAge);
        ageGaps.push(gap);
        const band = getAgeGapBand(gap);
        ageGapBands[band] = (ageGapBands[band] || 0) + 1;
      }
    }
  });

  if (groomAges.length > 0 || brideAges.length > 0) {
    const ageFacts: QuickFact[] = [];
    
    if (groomAges.length > 0) {
      groomAges.sort((a, b) => a - b);
      const medianGroomAge = groomAges.length % 2 === 0
        ? (groomAges[groomAges.length / 2 - 1] + groomAges[groomAges.length / 2]) / 2
        : groomAges[Math.floor(groomAges.length / 2)];
      ageFacts.push({ label: 'Median Groom Age', value: Math.round(medianGroomAge * 10) / 10 });
    }
    
    if (brideAges.length > 0) {
      brideAges.sort((a, b) => a - b);
      const medianBrideAge = brideAges.length % 2 === 0
        ? (brideAges[brideAges.length / 2 - 1] + brideAges[brideAges.length / 2]) / 2
        : brideAges[Math.floor(brideAges.length / 2)];
      ageFacts.push({ label: 'Median Bride Age', value: Math.round(medianBrideAge * 10) / 10 });
    }
    
    if (ageFacts.length > 0) {
      sections.push({
        title: 'Age Statistics',
        facts: ageFacts,
      });
    }

    // Age gap distribution
    if (ageGaps.length > 0) {
      const gapDistributionFacts: QuickFact[] = Object.entries(ageGapBands)
        .filter(([_, count]) => count > 0)
        .map(([band, count]) => ({
          label: band,
          value: count,
        }));
      
      if (gapDistributionFacts.length > 0) {
        sections.push({
          title: 'Age Gap Distribution',
          facts: gapDistributionFacts,
        });
      }
    }
  }

  if (dataQualityFacts.length > 0) {
    sections.push({
      title: 'Data Quality Issues',
      facts: dataQualityFacts,
    });
  }

  return {
    sections,
    isEmpty: sections.length === 0,
  };
}
