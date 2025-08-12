const path = require('path');

/**
 * Parse TSX questionnaire file to extract metadata and determine if it's a questionnaire
 */
class QuestionnaireParser {
  
  /**
   * Check if a file is a questionnaire based on content and filename
   * @param {string} fileName - The file name
   * @param {string} content - The file content
   * @returns {Object} - Questionnaire metadata or null
   */
  static parseQuestionnaire(fileName, content) {
    const extension = path.extname(fileName).toLowerCase();
    
    // Only process .tsx files
    if (extension !== '.tsx') {
      return null;
    }
    
    const metadata = this.extractMetadata(content);
    
    // Check if it's marked as a questionnaire
    if (!metadata.isQuestionnaire) {
      return null;
    }
    
    return {
      id: this.generateQuestionnaireId(fileName),
      fileName,
      title: metadata.title || this.extractTitleFromFileName(fileName),
      description: metadata.description || '',
      ageGroup: metadata.ageGroup || this.extractAgeGroupFromFileName(fileName),
      type: 'questionnaire',
      version: metadata.version || '1.0',
      author: metadata.author || 'Unknown',
      estimatedDuration: metadata.estimatedDuration || 10,
      questions: metadata.questions || [],
      metadata: metadata
    };
  }
  
  /**
   * Extract metadata from file content
   * @param {string} content - File content
   * @returns {Object} - Extracted metadata
   */
  static extractMetadata(content) {
    const metadata = {
      isQuestionnaire: false,
      title: null,
      description: null,
      ageGroup: null,
      version: null,
      author: null,
      estimatedDuration: null,
      questions: []
    };
    
    // Check for frontmatter-style comments
    const frontmatterRegex = /\/\*\*([\s\S]*?)\*\//;
    const frontmatterMatch = content.match(frontmatterRegex);
    
    if (frontmatterMatch) {
      const frontmatter = frontmatterMatch[1];
      
      // Extract @type questionnaire
      if (frontmatter.includes('@type questionnaire') || frontmatter.includes('@type: questionnaire')) {
        metadata.isQuestionnaire = true;
      }
      
      // Extract other metadata
      const titleMatch = frontmatter.match(/@title\s+(.+)/);
      if (titleMatch) metadata.title = titleMatch[1].trim();
      
      const descriptionMatch = frontmatter.match(/@description\s+(.+)/);
      if (descriptionMatch) metadata.description = descriptionMatch[1].trim();
      
      const ageGroupMatch = frontmatter.match(/@ageGroup\s+(.+)/);
      if (ageGroupMatch) metadata.ageGroup = ageGroupMatch[1].trim();
      
      const versionMatch = frontmatter.match(/@version\s+(.+)/);
      if (versionMatch) metadata.version = versionMatch[1].trim();
      
      const authorMatch = frontmatter.match(/@author\s+(.+)/);
      if (authorMatch) metadata.author = authorMatch[1].trim();
      
      const durationMatch = frontmatter.match(/@estimatedDuration\s+(\d+)/);
      if (durationMatch) metadata.estimatedDuration = parseInt(durationMatch[1]);
    }
    
    // Also check for single-line comments
    const singleLineChecks = [
      /\/\/\s*@type\s+questionnaire/,
      /\/\/\s*@type:\s*questionnaire/,
      /\/\*\s*@type\s+questionnaire/,
      /\/\*\s*@type:\s*questionnaire/
    ];
    
    for (const regex of singleLineChecks) {
      if (regex.test(content)) {
        metadata.isQuestionnaire = true;
        break;
      }
    }
    
    return metadata;
  }
  
  /**
   * Generate unique questionnaire ID from filename
   * @param {string} fileName - File name
   * @returns {string} - Questionnaire ID
   */
  static generateQuestionnaireId(fileName) {
    const baseName = path.basename(fileName, path.extname(fileName));
    return baseName.toLowerCase().replace(/[^a-z0-9]/g, '-');
  }
  
  /**
   * Extract title from filename
   * @param {string} fileName - File name
   * @returns {string} - Extracted title
   */
  static extractTitleFromFileName(fileName) {
    const baseName = path.basename(fileName, path.extname(fileName));
    // Convert camelCase and kebab-case to title case
    return baseName
      .replace(/([A-Z])/g, ' $1')
      .replace(/[-_]/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase())
      .trim();
  }
  
  /**
   * Extract age group from filename
   * @param {string} fileName - File name
   * @returns {string} - Extracted age group
   */
  static extractAgeGroupFromFileName(fileName) {
    const patterns = [
      { regex: /k-?2|kindergarten-?2/i, group: 'K-2' },
      { regex: /grade?s?\s*3-?5|3rd-?5th/i, group: '3-5' },
      { regex: /grade?s?\s*6-?8|6th-?8th/i, group: '6-8' },
      { regex: /grade?s?\s*9-?12|9th-?12th|high\s*school/i, group: '9-12' },
      { regex: /adult|grown-?up/i, group: 'Adult' },
      { regex: /pre-?k|preschool/i, group: 'Pre-K' }
    ];
    
    for (const pattern of patterns) {
      if (pattern.regex.test(fileName)) {
        return pattern.group;
      }
    }
    
    return 'General';
  }
  
  /**
   * Validate TSX content for security
   * @param {string} content - File content
   * @returns {Object} - Validation result
   */
  static validateContent(content) {
    const issues = [];
    const warnings = [];
    
    // Check for potentially dangerous imports
    const dangerousImports = [
      'fs', 'child_process', 'exec', 'spawn', 'eval',
      'Function', 'XMLHttpRequest', 'fetch'
    ];
    
    for (const dangerous of dangerousImports) {
      if (content.includes(dangerous)) {
        issues.push(`Potentially dangerous import or usage: ${dangerous}`);
      }
    }
    
    // Check for eval or similar dangerous functions
    const dangerousPatterns = [
      /eval\s*\(/,
      /Function\s*\(/,
      /new\s+Function/,
      /document\.write/,
      /innerHTML\s*=/,
      /dangerouslySetInnerHTML/
    ];
    
    for (const pattern of dangerousPatterns) {
      if (pattern.test(content)) {
        issues.push(`Potentially dangerous pattern found: ${pattern.source}`);
      }
    }
    
    // Warn about external URLs
    if (/https?:\/\//.test(content)) {
      warnings.push('External URLs detected - ensure they are safe');
    }
    
    return {
      isValid: issues.length === 0,
      issues,
      warnings
    };
  }
}

module.exports = QuestionnaireParser; 