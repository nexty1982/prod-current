/**
 * Smart Suggestion Engine for OCR Field Mapping
 * 
 * This module provides intelligent suggestions for OCR text-to-field mapping
 * based on historical user corrections and mapping patterns.
 */

interface MappingHistory {
  id: string;
  ocrText: string;
  fieldName: string;
  confidence: number;
  timestamp: string;
  churchId: string;
  userId?: string;
  wasManuallyEdited: boolean;
  correctedText?: string;
}

interface SuggestionRule {
  id: string;
  pattern: RegExp;
  fieldName: string;
  confidence: number;
  usage_count: number;
  success_rate: number;
  created: string;
  updated: string;
}

interface FieldSuggestion {
  fieldName: string;
  confidence: number;
  reason: string;
  source: 'pattern' | 'history' | 'similarity';
}

export class SmartSuggestionEngine {
  private mappingHistory: MappingHistory[] = [];
  private suggestionRules: SuggestionRule[] = [];
  private churchId: string;
  
  constructor(churchId: string) {
    this.churchId = churchId;
    this.loadMappingHistory();
    this.loadSuggestionRules();
    this.initializeDefaultRules();
  }

  /**
   * Get smart suggestions for OCR text mapping to fields
   */
  getSuggestionsForText(ocrText: string, availableFields: string[]): FieldSuggestion[] {
    const suggestions: FieldSuggestion[] = [];
    
    // 1. Check historical mappings (exact matches)
    const historicalSuggestions = this.getHistoricalSuggestions(ocrText, availableFields);
    suggestions.push(...historicalSuggestions);
    
    // 2. Check pattern-based rules
    const patternSuggestions = this.getPatternSuggestions(ocrText, availableFields);
    suggestions.push(...patternSuggestions);
    
    // 3. Check similarity-based suggestions
    const similaritySuggestions = this.getSimilaritySuggestions(ocrText, availableFields);
    suggestions.push(...similaritySuggestions);
    
    // Sort by confidence and remove duplicates
    return this.dedupeSuggestions(suggestions)
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 3); // Return top 3 suggestions
  }

  /**
   * Record a successful mapping for learning
   */
  recordMapping(ocrText: string, fieldName: string, confidence: number, wasManuallyEdited: boolean, correctedText?: string) {
    const mapping: MappingHistory = {
      id: `mapping_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ocrText,
      fieldName,
      confidence,
      timestamp: new Date().toISOString(),
      churchId: this.churchId,
      wasManuallyEdited,
      correctedText
    };
    
    this.mappingHistory.push(mapping);
    this.saveMappingHistory();
    
    // Update or create suggestion rules based on patterns
    this.updateSuggestionRules(ocrText, fieldName, confidence);
    
    // Trigger learning if we have enough data
    this.triggerLearning();
  }

  /**
   * Get mapping statistics for analysis
   */
  getMappingStats() {
    const totalMappings = this.mappingHistory.length;
    const manualEdits = this.mappingHistory.filter(m => m.wasManuallyEdited).length;
    const fieldFrequency: Record<string, number> = {};
    
    this.mappingHistory.forEach(mapping => {
      fieldFrequency[mapping.fieldName] = (fieldFrequency[mapping.fieldName] || 0) + 1;
    });
    
    return {
      totalMappings,
      manualEdits,
      editRate: totalMappings > 0 ? (manualEdits / totalMappings) * 100 : 0,
      fieldFrequency,
      avgConfidence: totalMappings > 0 
        ? this.mappingHistory.reduce((sum, m) => sum + m.confidence, 0) / totalMappings 
        : 0
    };
  }

  /**
   * Export mapping history for backup or analysis
   */
  exportMappingHistory(): string {
    return JSON.stringify({
      history: this.mappingHistory,
      rules: this.suggestionRules,
      exported: new Date().toISOString(),
      churchId: this.churchId
    }, null, 2);
  }

  /**
   * Import mapping history from backup
   */
  importMappingHistory(jsonData: string): boolean {
    try {
      const data = JSON.parse(jsonData);
      if (data.history && Array.isArray(data.history)) {
        this.mappingHistory = data.history.filter(h => h.churchId === this.churchId);
        this.saveMappingHistory();
      }
      if (data.rules && Array.isArray(data.rules)) {
        this.suggestionRules = data.rules;
        this.saveSuggestionRules();
      }
      return true;
    } catch (error) {
      console.error('Failed to import mapping history:', error);
      return false;
    }
  }

  // Private methods

  private getHistoricalSuggestions(ocrText: string, availableFields: string[]): FieldSuggestion[] {
    const suggestions: FieldSuggestion[] = [];
    const exactMatches = this.mappingHistory.filter(h => 
      h.ocrText.toLowerCase() === ocrText.toLowerCase() && 
      availableFields.includes(h.fieldName)
    );
    
    if (exactMatches.length >= 2) {
      // If this text has been mapped to the same field multiple times, suggest it
      const fieldCounts: Record<string, number> = {};
      exactMatches.forEach(match => {
        fieldCounts[match.fieldName] = (fieldCounts[match.fieldName] || 0) + 1;
      });
      
      Object.entries(fieldCounts).forEach(([fieldName, count]) => {
        if (count >= 2) {
          suggestions.push({
            fieldName,
            confidence: Math.min(0.95, 0.6 + (count * 0.1)),
            reason: `Previously mapped ${count} times`,
            source: 'history'
          });
        }
      });
    }
    
    return suggestions;
  }

  private getPatternSuggestions(ocrText: string, availableFields: string[]): FieldSuggestion[] {
    const suggestions: FieldSuggestion[] = [];
    
    this.suggestionRules.forEach(rule => {
      if (rule.pattern.test(ocrText) && availableFields.includes(rule.fieldName)) {
        suggestions.push({
          fieldName: rule.fieldName,
          confidence: Math.min(rule.confidence, rule.success_rate),
          reason: `Matches pattern (${rule.usage_count} uses, ${Math.round(rule.success_rate * 100)}% success)`,
          source: 'pattern'
        });
      }
    });
    
    return suggestions;
  }

  private getSimilaritySuggestions(ocrText: string, availableFields: string[]): FieldSuggestion[] {
    const suggestions: FieldSuggestion[] = [];
    const text = ocrText.toLowerCase().trim();
    
    // Simple similarity-based suggestions
    const recentMappings = this.mappingHistory
      .filter(h => availableFields.includes(h.fieldName))
      .slice(-50); // Check last 50 mappings
    
    recentMappings.forEach(mapping => {
      const similarity = this.calculateSimilarity(text, mapping.ocrText.toLowerCase());
      if (similarity > 0.7) {
        suggestions.push({
          fieldName: mapping.fieldName,
          confidence: similarity * 0.6, // Lower confidence for similarity matches
          reason: `Similar to "${mapping.ocrText}" (${Math.round(similarity * 100)}% match)`,
          source: 'similarity'
        });
      }
    });
    
    return suggestions;
  }

  private calculateSimilarity(str1: string, str2: string): number {
    // Simple Levenshtein distance-based similarity
    const maxLength = Math.max(str1.length, str2.length);
    if (maxLength === 0) return 1;
    
    const distance = this.levenshteinDistance(str1, str2);
    return (maxLength - distance) / maxLength;
  }

  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = [];
    
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    
    return matrix[str2.length][str1.length];
  }

  private dedupeSuggestions(suggestions: FieldSuggestion[]): FieldSuggestion[] {
    const seen = new Set<string>();
    return suggestions.filter(suggestion => {
      if (seen.has(suggestion.fieldName)) {
        return false;
      }
      seen.add(suggestion.fieldName);
      return true;
    });
  }

  private updateSuggestionRules(ocrText: string, fieldName: string, confidence: number) {
    // Create patterns based on successful mappings
    const patterns = this.generatePatternsForText(ocrText, fieldName);
    
    patterns.forEach(pattern => {
      const existingRule = this.suggestionRules.find(r => 
        r.pattern.source === pattern.source && r.fieldName === fieldName
      );
      
      if (existingRule) {
        existingRule.usage_count++;
        existingRule.success_rate = (existingRule.success_rate * (existingRule.usage_count - 1) + confidence) / existingRule.usage_count;
        existingRule.updated = new Date().toISOString();
      } else {
        this.suggestionRules.push({
          id: `rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          pattern,
          fieldName,
          confidence: confidence * 0.8, // Slightly lower confidence for new patterns
          usage_count: 1,
          success_rate: confidence,
          created: new Date().toISOString(),
          updated: new Date().toISOString()
        });
      }
    });
    
    this.saveSuggestionRules();
  }

  private generatePatternsForText(ocrText: string, fieldName: string): RegExp[] {
    const patterns: RegExp[] = [];
    const text = ocrText.trim();
    
    // Date patterns
    if (fieldName.includes('date')) {
      if (/\d{1,2}\/\d{1,2}\/?\d{0,4}/.test(text)) {
        patterns.push(/\d{1,2}\/\d{1,2}\/?\d{0,4}/);
      }
      if (/\d{1,2}-\d{1,2}-?\d{0,4}/.test(text)) {
        patterns.push(/\d{1,2}-\d{1,2}-?\d{0,4}/);
      }
      if (/\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s*\d{4}/i.test(text)) {
        patterns.push(/\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s*\d{4}/i);
      }
    }
    
    // Age patterns
    if (fieldName.includes('age')) {
      if (/^\d{1,3}$/.test(text)) {
        patterns.push(/^\d{1,3}$/);
      }
    }
    
    // Name patterns
    if (fieldName.includes('name')) {
      if (/^[A-Z][a-z]+(\s+[A-Z][a-z]+)+$/.test(text)) {
        patterns.push(/^[A-Z][a-z]+(\s+[A-Z][a-z]+)+$/);
      }
    }
    
    // Priest patterns
    if (fieldName.includes('priest')) {
      if (/^(Fr\.|Father|Rev\.|Reverend)\s+/.test(text)) {
        patterns.push(/^(Fr\.|Father|Rev\.|Reverend)\s+/);
      }
    }
    
    return patterns;
  }

  private triggerLearning() {
    // Clean up old or low-performing rules periodically
    if (this.mappingHistory.length % 50 === 0) {
      this.cleanupSuggestionRules();
    }
  }

  private cleanupSuggestionRules() {
    // Remove rules with low success rate or usage
    this.suggestionRules = this.suggestionRules.filter(rule => 
      rule.usage_count >= 2 && rule.success_rate >= 0.4
    );
    
    // Keep only the most recent 1000 mappings
    if (this.mappingHistory.length > 1000) {
      this.mappingHistory = this.mappingHistory
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 1000);
    }
    
    this.saveMappingHistory();
    this.saveSuggestionRules();
  }

  private initializeDefaultRules() {
    if (this.suggestionRules.length === 0) {
      const defaultRules: Omit<SuggestionRule, 'id' | 'created' | 'updated'>[] = [
        {
          pattern: /\d{1,2}\/\d{1,2}\/\d{4}/,
          fieldName: 'baptism_date',
          confidence: 0.8,
          usage_count: 1,
          success_rate: 0.8
        },
        {
          pattern: /\d{1,2}\/\d{1,2}\/\d{4}/,
          fieldName: 'birth_date',
          confidence: 0.8,
          usage_count: 1,
          success_rate: 0.8
        },
        {
          pattern: /\d{1,2}\/\d{1,2}\/\d{4}/,
          fieldName: 'death_date',
          confidence: 0.8,
          usage_count: 1,
          success_rate: 0.8
        },
        {
          pattern: /^(Fr\.|Father|Rev\.|Reverend)\s+/i,
          fieldName: 'priest_name',
          confidence: 0.9,
          usage_count: 1,
          success_rate: 0.9
        },
        {
          pattern: /^\d{1,3}$/,
          fieldName: 'age',
          confidence: 0.7,
          usage_count: 1,
          success_rate: 0.7
        }
      ];
      
      this.suggestionRules = defaultRules.map(rule => ({
        ...rule,
        id: `default_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        created: new Date().toISOString(),
        updated: new Date().toISOString()
      }));
      
      this.saveSuggestionRules();
    }
  }

  private loadMappingHistory() {
    try {
      const stored = localStorage.getItem(`ocr-mapping-history-${this.churchId}`);
      if (stored) {
        this.mappingHistory = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Failed to load mapping history:', error);
      this.mappingHistory = [];
    }
  }

  private saveMappingHistory() {
    try {
      localStorage.setItem(`ocr-mapping-history-${this.churchId}`, JSON.stringify(this.mappingHistory));
    } catch (error) {
      console.error('Failed to save mapping history:', error);
    }
  }

  private loadSuggestionRules() {
    try {
      const stored = localStorage.getItem(`ocr-suggestion-rules-${this.churchId}`);
      if (stored) {
        this.suggestionRules = JSON.parse(stored).map((rule: any) => ({
          ...rule,
          pattern: new RegExp(rule.pattern.source, rule.pattern.flags)
        }));
      }
    } catch (error) {
      console.error('Failed to load suggestion rules:', error);
      this.suggestionRules = [];
    }
  }

  private saveSuggestionRules() {
    try {
      const serializable = this.suggestionRules.map(rule => ({
        ...rule,
        pattern: {
          source: rule.pattern.source,
          flags: rule.pattern.flags
        }
      }));
      localStorage.setItem(`ocr-suggestion-rules-${this.churchId}`, JSON.stringify(serializable));
    } catch (error) {
      console.error('Failed to save suggestion rules:', error);
    }
  }
}
