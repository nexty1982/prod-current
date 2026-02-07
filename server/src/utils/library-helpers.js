/**
 * OM-Library Helper Utilities
 * Reusable functions for filename similarity, grouping, and processing
 */

const { LIBRARY_CONFIG } = require('../config/library-config');

/**
 * Calculate Jaro-Winkler similarity between two strings
 * @param {string} s1 - First string
 * @param {string} s2 - Second string
 * @returns {number} - Similarity score (0-1)
 */
function jaroWinklerSimilarity(s1, s2) {
  if (s1 === s2) return 1.0;
  
  const len1 = s1.length;
  const len2 = s2.length;
  
  if (len1 === 0 || len2 === 0) return 0.0;
  
  const matchWindow = Math.floor(Math.max(len1, len2) / 2) - 1;
  const s1Matches = new Array(len1).fill(false);
  const s2Matches = new Array(len2).fill(false);
  
  let matches = 0;
  let transpositions = 0;
  
  // Find matches
  for (let i = 0; i < len1; i++) {
    const start = Math.max(0, i - matchWindow);
    const end = Math.min(i + matchWindow + 1, len2);
    
    for (let j = start; j < end; j++) {
      if (s2Matches[j] || s1[i] !== s2[j]) continue;
      s1Matches[i] = true;
      s2Matches[j] = true;
      matches++;
      break;
    }
  }
  
  if (matches === 0) return 0.0;
  
  // Find transpositions
  let k = 0;
  for (let i = 0; i < len1; i++) {
    if (!s1Matches[i]) continue;
    while (!s2Matches[k]) k++;
    if (s1[i] !== s2[k]) transpositions++;
    k++;
  }
  
  const jaro = (matches / len1 + matches / len2 + (matches - transpositions / 2) / matches) / 3;
  
  // Winkler modification (prefix bonus)
  let prefix = 0;
  for (let i = 0; i < Math.min(len1, len2, 4); i++) {
    if (s1[i] === s2[i]) prefix++;
    else break;
  }
  
  return jaro + prefix * 0.1 * (1 - jaro);
}

/**
 * Normalize filename for comparison
 * @param {string} filename - Filename to normalize
 * @returns {string} - Normalized filename
 */
function normalizeFilename(filename) {
  return filename
    .toLowerCase()
    .replace(/^\d{4}-\d{2}-\d{2}[_-]/, '') // Remove date prefix
    .replace(/\.[^.]+$/, '') // Remove extension
    .replace(/[_-]/g, ' ') // Replace separators with spaces
    .replace(/\s+/g, ' ') // Collapse multiple spaces
    .replace(/\(copy\)|\(duplicate\)|\(old\)|\(backup\)/gi, '') // Remove common suffixes
    .replace(/v?\d+(\.\d+)*$/, '') // Remove version numbers at end
    .trim();
}

/**
 * Extract words from normalized filename
 * @param {string} normalized - Normalized filename
 * @returns {string[]} - Array of words
 */
function extractWords(normalized) {
  return normalized
    .split(/\s+/)
    .filter(word => word.length >= LIBRARY_CONFIG.relationships.minWordLength);
}

/**
 * Calculate filename similarity score
 * @param {string} filename1 - First filename
 * @param {string} filename2 - Second filename
 * @returns {number} - Similarity score (0-1)
 */
function calculateFilenameSimilarity(filename1, filename2) {
  const norm1 = normalizeFilename(filename1);
  const norm2 = normalizeFilename(filename2);
  
  // Exact match after normalization
  if (norm1 === norm2) return 1.0;
  
  // Word-based similarity (faster, more intuitive)
  const words1 = new Set(extractWords(norm1));
  const words2 = new Set(extractWords(norm2));
  
  if (words1.size === 0 || words2.size === 0) return 0.0;
  
  // Count common words
  let common = 0;
  for (const word of words1) {
    if (words2.has(word)) common++;
  }
  
  // Jaccard similarity
  const union = words1.size + words2.size - common;
  const jaccard = union > 0 ? common / union : 0;
  
  // Also calculate Jaro-Winkler for full strings
  const jaroWinkler = jaroWinklerSimilarity(norm1, norm2);
  
  // Return weighted average (favor word-based)
  return jaccard * 0.7 + jaroWinkler * 0.3;
}

/**
 * Find related files based on filename similarity
 * @param {Object} targetFile - File to find relationships for
 * @param {Object[]} allFiles - All files in index
 * @param {number} threshold - Minimum similarity threshold (0-1)
 * @returns {Object[]} - Array of { fileId, score } for related files
 */
function findRelatedFiles(targetFile, allFiles, threshold = null) {
  const minThreshold = threshold || LIBRARY_CONFIG.relationships.filenameSimilarityThreshold;
  const related = [];
  
  for (const file of allFiles) {
    // Skip self
    if (file.id === targetFile.id) continue;
    
    // Only compare within same category (optional - can be removed)
    if (file.category !== targetFile.category) continue;
    
    // Calculate similarity
    const score = calculateFilenameSimilarity(targetFile.filename, file.filename);
    
    if (score >= minThreshold) {
      related.push({
        fileId: file.id,
        score: parseFloat(score.toFixed(4)),
      });
    }
  }
  
  // Sort by score descending
  related.sort((a, b) => b.score - a.score);
  
  return related;
}

/**
 * Group files by time buckets (Today, Yesterday, etc.)
 * @param {Object[]} files - Array of files with 'modified' field
 * @returns {Object} - Grouped files { today: [], yesterday: [], ... }
 */
function groupFilesByTime(files) {
  const now = Date.now();
  const groups = {
    today: [],
    yesterday: [],
    thisWeek: [],
    lastWeek: [],
    thisMonth: [],
    older: [],
  };
  
  const thresholds = LIBRARY_CONFIG.timeGroups;
  
  for (const file of files) {
    const modifiedDate = new Date(file.modified).getTime();
    const age = now - modifiedDate;
    
    if (age < thresholds.yesterday) {
      groups.today.push(file);
    } else if (age < thresholds.thisWeek) {
      groups.yesterday.push(file);
    } else if (age < thresholds.lastWeek) {
      groups.thisWeek.push(file);
    } else if (age < thresholds.thisMonth) {
      groups.lastWeek.push(file);
    } else if (age < 60 * 24 * 60 * 60 * 1000) { // ~2 months
      groups.thisMonth.push(file);
    } else {
      groups.older.push(file);
    }
  }
  
  // Return only non-empty groups with labels
  const result = [];
  const labels = {
    today: 'Today',
    yesterday: 'Yesterday',
    thisWeek: 'Earlier this week',
    lastWeek: 'Last week',
    thisMonth: 'Last month',
    older: 'Older',
  };
  
  for (const [key, items] of Object.entries(groups)) {
    if (items.length > 0) {
      result.push({
        key,
        label: labels[key],
        items,
        count: items.length,
      });
    }
  }
  
  return result;
}

/**
 * Paginate array of items
 * @param {Array} items - Items to paginate
 * @param {number} page - Page number (1-based)
 * @param {number} pageSize - Items per page
 * @returns {Object} - { items, total, page, pageSize, totalPages }
 */
function paginate(items, page = 1, pageSize = 25) {
  const total = items.length;
  const totalPages = Math.ceil(total / pageSize);
  const validPage = Math.max(1, Math.min(page, totalPages || 1));
  const offset = (validPage - 1) * pageSize;
  const paginatedItems = items.slice(offset, offset + pageSize);
  
  return {
    items: paginatedItems,
    total,
    page: validPage,
    pageSize,
    totalPages,
    hasNext: validPage < totalPages,
    hasPrev: validPage > 1,
  };
}

/**
 * Sort array of items by field
 * @param {Array} items - Items to sort
 * @param {string} sortBy - Field to sort by
 * @param {string} sortDir - 'asc' or 'desc'
 * @returns {Array} - Sorted items
 */
function sortItems(items, sortBy = 'modified', sortDir = 'desc') {
  const sorted = [...items];
  
  sorted.sort((a, b) => {
    let aVal = a[sortBy];
    let bVal = b[sortBy];
    
    // Handle missing values
    if (aVal == null) aVal = '';
    if (bVal == null) bVal = '';
    
    // Handle different types
    if (typeof aVal === 'string') aVal = aVal.toLowerCase();
    if (typeof bVal === 'string') bVal = bVal.toLowerCase();
    
    // Compare
    let comparison = 0;
    if (aVal < bVal) comparison = -1;
    else if (aVal > bVal) comparison = 1;
    
    return sortDir === 'desc' ? -comparison : comparison;
  });
  
  return sorted;
}

module.exports = {
  jaroWinklerSimilarity,
  normalizeFilename,
  extractWords,
  calculateFilenameSimilarity,
  findRelatedFiles,
  groupFilesByTime,
  paginate,
  sortItems,
};
