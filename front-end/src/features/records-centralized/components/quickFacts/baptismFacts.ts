/**
 * Baptism Records Quick Facts Calculator
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
 * Calculate age at baptism in days
 */
function calculateAgeAtBaptism(baptismDate: Date | null, birthDate: Date | null): number | null {
  if (!baptismDate || !birthDate) return null;
  const ageMs = baptismDate.getTime() - birthDate.getTime();
  const ageDays = ageMs / (1000 * 60 * 60 * 24);
  return Math.floor(ageDays);
}

/**
 * Get age at baptism band
 */
function getAgeAtBaptismBand(ageDays: number): string {
  if (ageDays <= 30) return '0–30 days';
  if (ageDays <= 180) return '1–6 months';
  if (ageDays <= 365) return '6–12 months';
  if (ageDays <= 1095) return '1–3 years';
  if (ageDays <= 4380) return '4–12 years';
  if (ageDays <= 6205) return '13–17 years';
  return '18+ years';
}

/**
 * Get records from last N months
 */
function getLastNMonthsRecords(records: any[], months: number): any[] {
  const cutoffDate = new Date();
  cutoffDate.setMonth(cutoffDate.getMonth() - months);
  return records.filter(record => {
    const baptismDate = parseDate(record.date_of_baptism || record.dateOfBaptism || record.reception_date || record.receptionDate);
    return baptismDate && baptismDate >= cutoffDate;
  });
}

/**
 * Compute quick facts for baptism records
 */
export function computeBaptismFacts(
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

  // Age at baptism calculations
  const agesAtBaptism: number[] = [];
  const ageBands: Record<string, number> = {
    '0–30 days': 0,
    '1–6 months': 0,
    '6–12 months': 0,
    '1–3 years': 0,
    '4–12 years': 0,
    '13–17 years': 0,
    '18+ years': 0,
  };

  records.forEach(record => {
    const baptismDate = parseDate(record.date_of_baptism || record.dateOfBaptism || record.reception_date || record.receptionDate);
    const birthDate = parseDate(record.birth_date || record.birthDate);
    const ageDays = calculateAgeAtBaptism(baptismDate, birthDate);
    
    if (ageDays !== null && ageDays >= 0) {
      agesAtBaptism.push(ageDays);
      const band = getAgeAtBaptismBand(ageDays);
      ageBands[band] = (ageBands[band] || 0) + 1;
    }
  });

  if (agesAtBaptism.length > 0) {
    agesAtBaptism.sort((a, b) => a - b);
    const medianAgeDays = agesAtBaptism.length % 2 === 0
      ? (agesAtBaptism[agesAtBaptism.length / 2 - 1] + agesAtBaptism[agesAtBaptism.length / 2]) / 2
      : agesAtBaptism[Math.floor(agesAtBaptism.length / 2)];
    
    const medianYears = Math.floor(medianAgeDays / 365.25);
    const medianMonths = Math.floor((medianAgeDays % 365.25) / 30.44);
    const medianDays = Math.floor(medianAgeDays % 30.44);
    
    let medianDisplay = '';
    if (medianYears > 0) {
      medianDisplay = `${medianYears}y`;
      if (medianMonths > 0) medianDisplay += ` ${medianMonths}mo`;
    } else if (medianMonths > 0) {
      medianDisplay = `${medianMonths}mo`;
      if (medianDays > 0) medianDisplay += ` ${medianDays}d`;
    } else {
      medianDisplay = `${medianDays}d`;
    }

    sections.push({
      title: 'Age at Baptism',
      facts: [
        { label: 'Median Age', value: medianDisplay },
      ],
    });

    // Age distribution
    const distributionFacts: QuickFact[] = Object.entries(ageBands)
      .filter(([_, count]) => count > 0)
      .map(([band, count]) => ({
        label: band,
        value: count,
      }));
    
    if (distributionFacts.length > 0) {
      sections.push({
        title: 'Age at Baptism Distribution',
        facts: distributionFacts,
      });
    }
  }

  // Last 12 months vs prior 12 months
  const last12Months = getLastNMonthsRecords(records, 12);
  const prior12Months = getLastNMonthsRecords(records, 24).filter(record => {
    const baptismDate = parseDate(record.date_of_baptism || record.dateOfBaptism || record.reception_date || record.receptionDate);
    if (!baptismDate) return false;
    const cutoffDate = new Date();
    cutoffDate.setMonth(cutoffDate.getMonth() - 12);
    return baptismDate < cutoffDate;
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

  // Top sponsors
  const sponsorCounts: Record<string, number> = {};
  records.forEach(record => {
    const sponsors = record.sponsors || record.sponsor;
    if (sponsors) {
      if (typeof sponsors === 'string') {
        // Handle comma-separated or single sponsor
        const sponsorList = sponsors.split(',').map(s => s.trim()).filter(s => s);
        sponsorList.forEach(sponsor => {
          sponsorCounts[sponsor] = (sponsorCounts[sponsor] || 0) + 1;
        });
      } else if (Array.isArray(sponsors)) {
        sponsors.forEach(sponsor => {
          const sponsorName = typeof sponsor === 'string' ? sponsor : (sponsor?.name || sponsor?.label || String(sponsor));
          if (sponsorName) {
            sponsorCounts[sponsorName] = (sponsorCounts[sponsorName] || 0) + 1;
          }
        });
      }
    }
  });

  const topSponsors = Object.entries(sponsorCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([name, count]) => ({ label: name, value: count }));

  if (topSponsors.length > 0) {
    sections.push({
      title: 'Top Sponsors',
      facts: topSponsors,
    });
  }

  // Data quality checks
  let missingSponsors = 0;
  let missingParents = 0;
  let badDataCount = 0;
  let missingBirthDate = 0;
  let missingBaptismDate = 0;

  records.forEach(record => {
    const baptismDate = parseDate(record.date_of_baptism || record.dateOfBaptism || record.reception_date || record.receptionDate);
    const birthDate = parseDate(record.birth_date || record.birthDate);
    
    if (!birthDate) missingBirthDate++;
    if (!baptismDate) missingBaptismDate++;
    if (birthDate && baptismDate && baptismDate < birthDate) {
      badDataCount++;
    }
    
    const sponsors = record.sponsors || record.sponsor;
    if (!sponsors || (typeof sponsors === 'string' && !sponsors.trim()) || (Array.isArray(sponsors) && sponsors.length === 0)) {
      missingSponsors++;
    }
    
    const parents = record.parents || record.parent;
    if (!parents || (typeof parents === 'string' && !parents.trim()) || (Array.isArray(parents) && parents.length === 0)) {
      missingParents++;
    }
  });

  const dataQualityFacts: QuickFact[] = [];
  if (missingBirthDate > 0) {
    dataQualityFacts.push({ label: 'Missing Birth Date', value: missingBirthDate });
  }
  if (missingBaptismDate > 0) {
    dataQualityFacts.push({ label: 'Missing Baptism Date', value: missingBaptismDate });
  }
  if (badDataCount > 0) {
    dataQualityFacts.push({
      label: 'Baptism < Birth Date',
      value: badDataCount,
      tooltip: 'Records where baptism date is before birth date (data quality issue)',
    });
  }
  if (missingSponsors > 0) {
    dataQualityFacts.push({ label: 'Missing Sponsors', value: missingSponsors });
  }
  if (missingParents > 0) {
    dataQualityFacts.push({ label: 'Missing Parents', value: missingParents });
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
