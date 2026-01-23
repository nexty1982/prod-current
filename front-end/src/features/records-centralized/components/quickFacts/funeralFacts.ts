/**
 * Funeral Records Quick Facts Calculator
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
 * Calculate age from death date and birth date
 */
function calculateAge(deathDate: Date | null, birthDate: Date | null): number | null {
  if (!deathDate || !birthDate) return null;
  const ageMs = deathDate.getTime() - birthDate.getTime();
  const ageYears = ageMs / (1000 * 60 * 60 * 24 * 365.25);
  return Math.floor(ageYears);
}

/**
 * Get age band for a given age
 */
function getAgeBand(age: number): string {
  if (age <= 1) return '0–1';
  if (age <= 5) return '1–5';
  if (age <= 12) return '6–12';
  if (age <= 17) return '13–17';
  if (age <= 29) return '18–29';
  if (age <= 44) return '30–44';
  if (age <= 64) return '45–64';
  if (age <= 79) return '65–79';
  if (age <= 89) return '80–89';
  return '90+';
}

/**
 * Get records from last N months
 */
function getLastNMonthsRecords(records: any[], months: number): any[] {
  const cutoffDate = new Date();
  cutoffDate.setMonth(cutoffDate.getMonth() - months);
  return records.filter(record => {
    const deathDate = parseDate(record.death_date || record.deathDate || record.deceased_date || record.deceasedDate);
    return deathDate && deathDate >= cutoffDate;
  });
}

/**
 * Compute quick facts for funeral records
 */
export function computeFuneralFacts(
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

  // Age calculations
  const ages: number[] = [];
  const ageBands: Record<string, number> = {
    '0–1': 0,
    '1–5': 0,
    '6–12': 0,
    '13–17': 0,
    '18–29': 0,
    '30–44': 0,
    '45–64': 0,
    '65–79': 0,
    '80–89': 0,
    '90+': 0,
  };
  let unknownAgeCount = 0;
  let invalidAgeCount = 0;

  records.forEach(record => {
    const deathDate = parseDate(record.death_date || record.deathDate || record.deceased_date || record.deceasedDate);
    const birthDate = parseDate(record.birth_date || record.birthDate);
    const age = calculateAge(deathDate, birthDate);
    
    if (age !== null && age >= 0 && age <= 150) {
      ages.push(age);
      const band = getAgeBand(age);
      ageBands[band] = (ageBands[band] || 0) + 1;
    } else if (age === null) {
      unknownAgeCount++;
    } else {
      invalidAgeCount++;
    }
  });

  if (ages.length > 0) {
    ages.sort((a, b) => a - b);
    const medianAge = ages.length % 2 === 0
      ? (ages[ages.length / 2 - 1] + ages[ages.length / 2]) / 2
      : ages[Math.floor(ages.length / 2)];
    const averageAge = ages.reduce((sum, age) => sum + age, 0) / ages.length;
    const youngest = ages[0];
    const oldest = ages[ages.length - 1];

    sections.push({
      title: 'Age Statistics',
      facts: [
        { label: 'Median Age', value: Math.round(medianAge * 10) / 10 },
        { label: 'Average Age', value: Math.round(averageAge * 10) / 10 },
        { label: 'Youngest', value: youngest },
        { label: 'Oldest', value: oldest },
      ],
    });

    // Age distribution
    const distributionFacts: QuickFact[] = Object.entries(ageBands)
      .filter(([_, count]) => count > 0)
      .map(([band, count]) => ({
        label: `${band} years`,
        value: count,
      }));
    
    if (distributionFacts.length > 0) {
      sections.push({
        title: 'Age Distribution',
        facts: distributionFacts,
      });
    }
  }

  if (unknownAgeCount > 0 || invalidAgeCount > 0) {
    sections.push({
      title: 'Data Quality',
      facts: [
        ...(unknownAgeCount > 0 ? [{ label: 'Unknown/Invalid Age', value: unknownAgeCount }] : []),
        ...(invalidAgeCount > 0 ? [{ label: 'Invalid Age Data', value: invalidAgeCount }] : []),
      ],
    });
  }

  // Last 12 months vs prior 12 months
  const last12Months = getLastNMonthsRecords(records, 12);
  const prior12Months = getLastNMonthsRecords(records, 24).filter(record => {
    const deathDate = parseDate(record.death_date || record.deathDate || record.deceased_date || record.deceasedDate);
    if (!deathDate) return false;
    const cutoffDate = new Date();
    cutoffDate.setMonth(cutoffDate.getMonth() - 12);
    return deathDate < cutoffDate;
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
  let missingDeathDate = 0;
  let missingBurialDate = 0;
  let badDataCount = 0;

  records.forEach(record => {
    const deathDate = parseDate(record.death_date || record.deathDate || record.deceased_date || record.deceasedDate);
    const burialDate = parseDate(record.burial_date || record.burialDate);
    
    if (!deathDate) missingDeathDate++;
    if (!burialDate) missingBurialDate++;
    if (deathDate && burialDate && burialDate < deathDate) {
      badDataCount++;
    }
  });

  const dataQualityFacts: QuickFact[] = [];
  if (missingDeathDate > 0) {
    dataQualityFacts.push({ label: 'Missing Death Date', value: missingDeathDate });
  }
  if (missingBurialDate > 0) {
    dataQualityFacts.push({ label: 'Missing Burial Date', value: missingBurialDate });
  }
  if (badDataCount > 0) {
    dataQualityFacts.push({
      label: 'Burial < Death Date',
      value: badDataCount,
      tooltip: 'Records where burial date is before death date (data quality issue)',
    });
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
