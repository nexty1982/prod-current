const path = require('path');
const fs = require('fs');
const publicImagesFs = require('./publicImagesFs');

/**
 * Catalog Suggestion Service
 * 
 * Provides intelligent suggestions for organizing images into directories
 * based on filename patterns and custom rules.
 * 
 * Total lines: ~200
 */

// Default heuristics for catalog suggestions
const DEFAULT_HEURISTICS = [
  {
    pattern: /banner/i,
    suggestedDir: 'banners',
    confidence: 0.8,
    reason: 'Filename contains "banner"'
  },
  {
    pattern: /logo/i,
    suggestedDir: 'logos',
    confidence: 0.8,
    reason: 'Filename contains "logo"'
  },
  {
    pattern: /bg|background/i,
    suggestedDir: 'backgrounds',
    confidence: 0.7,
    reason: 'Filename contains "bg" or "background"'
  },
  {
    pattern: /pattern/i,
    suggestedDir: 'patterns',
    confidence: 0.7,
    reason: 'Filename contains "pattern"'
  },
  {
    pattern: /icon/i,
    suggestedDir: 'icons',
    confidence: 0.8,
    reason: 'Filename contains "icon"'
  },
  {
    pattern: /avatar|profile/i,
    suggestedDir: 'avatars',
    confidence: 0.7,
    reason: 'Filename contains "avatar" or "profile"'
  },
  {
    pattern: /thumbnail|thumb/i,
    suggestedDir: 'thumbnails',
    confidence: 0.7,
    reason: 'Filename contains "thumbnail" or "thumb"'
  }
];

/**
 * Load custom catalog rules from .catalog-rules.json
 * 
 * @returns {Array} Array of rule objects
 */
function loadCustomRules() {
  try {
    const rulesPath = path.join(publicImagesFs.getImagesRoot(), '.catalog-rules.json');
    if (fs.existsSync(rulesPath)) {
      const rulesContent = fs.readFileSync(rulesPath, 'utf8');
      const rules = JSON.parse(rulesContent);
      return Array.isArray(rules) ? rules : [];
    }
  } catch (error) {
    console.warn('Could not load custom catalog rules:', error.message);
  }
  return [];
}

/**
 * Get suggested destination for an image
 * 
 * @param {string} imagePath - Relative path to image
 * @param {string} imageName - Image filename
 * @returns {Object} Suggestion object with path, suggestedDir, suggestedName, confidence, reasons
 */
function suggestDestination(imagePath, imageName) {
  const suggestions = [];
  const customRules = loadCustomRules();
  const allRules = [...DEFAULT_HEURISTICS, ...customRules];
  
  // Check if image is already in a matching directory
  const currentDir = path.dirname(imagePath);
  const fileName = path.basename(imageName, path.extname(imageName));
  const ext = path.extname(imageName);
  
  // Apply heuristics
  for (const rule of allRules) {
    const pattern = typeof rule.pattern === 'string' 
      ? new RegExp(rule.pattern, 'i')
      : rule.pattern;
    
    if (pattern.test(imageName) || pattern.test(fileName)) {
      const suggestedDir = rule.suggestedDir || rule.directory;
      let confidence = rule.confidence || 0.5;
      const reason = rule.reason || rule.description || 'Matches pattern';
      
      // Boost confidence if already in matching directory
      if (currentDir.includes(suggestedDir)) {
        confidence = Math.min(confidence + 0.2, 1.0);
      }
      
      suggestions.push({
        suggestedDir,
        confidence,
        reason
      });
    }
  }
  
  // If no suggestions, default to current directory or 'gallery'
  if (suggestions.length === 0) {
    return {
      path: imagePath,
      suggestedDir: currentDir || 'gallery',
      suggestedName: imageName,
      confidence: 0.3,
      reasons: ['No matching patterns found']
    };
  }
  
  // Sort by confidence (highest first)
  suggestions.sort((a, b) => b.confidence - a.confidence);
  const bestSuggestion = suggestions[0];
  
  // Generate suggested name (could be improved with slug generation)
  let suggestedName = imageName;
  if (bestSuggestion.suggestedName) {
    suggestedName = bestSuggestion.suggestedName;
  } else {
    // Optionally sanitize name
    suggestedName = publicImagesFs.sanitizeFilename(imageName, 'slug');
  }
  
  return {
    path: imagePath,
    suggestedDir: bestSuggestion.suggestedDir,
    suggestedName,
    confidence: bestSuggestion.confidence,
    reasons: suggestions.map(s => s.reason)
  };
}

/**
 * Suggest destinations for multiple images
 * 
 * @param {Array} images - Array of { path, name } objects
 * @returns {Array} Array of suggestion objects
 */
function suggestDestinations(images) {
  if (!Array.isArray(images)) {
    return [];
  }
  
  return images.map(img => {
    const path = img.path || '';
    const name = img.name || path.split('/').pop() || 'unknown';
    return suggestDestination(path, name);
  });
}

module.exports = {
  suggestDestination,
  suggestDestinations,
  loadCustomRules
};
