/**
 * OMAI Memory Core - Knowledge Base Manager
 * Loads, indexes, and retrieves contextual information from documentation
 * Created: 2025-07-27
 */

import * as fs from 'fs/promises';
import * as path from 'path';

interface MemoryEntry {
  id: string;
  content: string;
  tags: string[];
  category: string;
  title?: string;
  section?: string;
  priority: number;
  timestamp: string;
}

interface SearchResult {
  entry: MemoryEntry;
  relevanceScore: number;
  matchedTerms: string[];
}

/**
 * Memory core for OMAI knowledge management
 */
export class OMAIMemoryCore {
  private memory: Map<string, MemoryEntry> = new Map();
  private categoryIndex: Map<string, string[]> = new Map();
  private tagIndex: Map<string, string[]> = new Map();
  private isInitialized: boolean = false;
  private operatorsManualPath: string;

  constructor() {
    this.operatorsManualPath = path.join(process.cwd(), 'docs', 'OMAI_OPERATORS_MANUAL.md');
  }

  /**
   * Initialize memory core and load operators manual
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    console.log('[OMAI Memory] Initializing memory core...');
    
    try {
      await this.loadOperatorsManual();
      await this.buildIndices();
      this.isInitialized = true;
      console.log(`[OMAI Memory] Loaded ${this.memory.size} knowledge entries`);
    } catch (error) {
      console.error('[OMAI Memory] Failed to initialize:', error);
      throw error;
    }
  }

  /**
   * Load and parse the operators manual
   */
  private async loadOperatorsManual(): Promise<void> {
    try {
      const content = await fs.readFile(this.operatorsManualPath, 'utf8');
      await this.parseMarkdownContent(content, 'operators_manual');
    } catch (error) {
      console.warn('[OMAI Memory] Could not load operators manual:', error.message);
      // Create fallback entries if manual is missing
      await this.createFallbackEntries();
    }
  }

  /**
   * Parse markdown content into memory entries
   */
  private async parseMarkdownContent(content: string, category: string): Promise<void> {
    const lines = content.split('\n');
    let currentSection = '';
    let currentContent = '';
    let currentTitle = '';
    let sectionLevel = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Detect headers
      const headerMatch = line.match(/^(#{1,6})\s+(.+)$/);
      if (headerMatch) {
        // Save previous section if exists
        if (currentContent.trim() && currentTitle) {
          await this.addMemoryEntry({
            title: currentTitle,
            content: currentContent.trim(),
            section: currentSection,
            category,
            tags: this.extractTags(currentTitle + ' ' + currentContent),
            priority: this.calculatePriority(currentTitle, sectionLevel)
          });
        }

        // Start new section
        sectionLevel = headerMatch[1].length;
        currentTitle = headerMatch[2];
        currentSection = currentTitle;
        currentContent = '';
      } else {
        currentContent += line + '\n';
      }
    }

    // Save final section
    if (currentContent.trim() && currentTitle) {
      await this.addMemoryEntry({
        title: currentTitle,
        content: currentContent.trim(),
        section: currentSection,
        category,
        tags: this.extractTags(currentTitle + ' ' + currentContent),
        priority: this.calculatePriority(currentTitle, sectionLevel)
      });
    }
  }

  /**
   * Add memory entry
   */
  private async addMemoryEntry(entry: {
    title: string;
    content: string;
    section: string;
    category: string;
    tags: string[];
    priority: number;
  }): Promise<void> {
    const id = this.generateId(entry.title, entry.section);
    
    const memoryEntry: MemoryEntry = {
      id,
      content: entry.content,
      tags: entry.tags,
      category: entry.category,
      title: entry.title,
      section: entry.section,
      priority: entry.priority,
      timestamp: new Date().toISOString()
    };

    this.memory.set(id, memoryEntry);
  }

  /**
   * Extract relevant tags from content
   */
  private extractTags(text: string): string[] {
    const tagPatterns = [
      // Role-based tags
      /\b(super_admin|admin|user|guest)\b/gi,
      // Command tags
      /\b(command|api|endpoint|route)\b/gi,
      // Behavior tags
      /\b(troubleshoot|diagnos|error|fix|problem)\b/gi,
      // Feature tags
      /\b(mobile|desktop|pwa|learning|agent)\b/gi,
      // System tags
      /\b(security|backup|maintenance|configuration)\b/gi
    ];

    const tags = new Set<string>();
    
    for (const pattern of tagPatterns) {
      const matches = text.match(pattern);
      if (matches) {
        matches.forEach(match => tags.add(match.toLowerCase()));
      }
    }

    // Add semantic tags based on content
    if (/quick\s+reference|command|essential/i.test(text)) {
      tags.add('quick-reference');
    }
    if (/troubleshoot|problem|error|issue/i.test(text)) {
      tags.add('troubleshooting');
    }
    if (/api|endpoint|curl|http/i.test(text)) {
      tags.add('api');
    }
    if (/mobile|samsung|fold|pwa/i.test(text)) {
      tags.add('mobile');
    }

    return Array.from(tags);
  }

  /**
   * Calculate entry priority based on section importance
   */
  private calculatePriority(title: string, sectionLevel: number): number {
    let priority = 5; // Base priority

    // Adjust based on section level (higher level = more important)
    priority += (6 - sectionLevel);

    // Boost priority for important sections
    if (/quick\s+reference|essential|emergency|troubleshoot/i.test(title)) {
      priority += 3;
    }
    if (/api|command|endpoint/i.test(title)) {
      priority += 2;
    }
    if (/overview|introduction|getting\s+started/i.test(title)) {
      priority += 1;
    }

    return Math.min(priority, 10); // Cap at 10
  }

  /**
   * Build search indices
   */
  private async buildIndices(): Promise<void> {
    this.categoryIndex.clear();
    this.tagIndex.clear();

    for (const [id, entry] of this.memory) {
      // Category index
      if (!this.categoryIndex.has(entry.category)) {
        this.categoryIndex.set(entry.category, []);
      }
      this.categoryIndex.get(entry.category)!.push(id);

      // Tag index
      for (const tag of entry.tags) {
        if (!this.tagIndex.has(tag)) {
          this.tagIndex.set(tag, []);
        }
        this.tagIndex.get(tag)!.push(id);
      }
    }
  }

  /**
   * Search memory for relevant entries
   */
  public search(query: string, maxResults: number = 3): SearchResult[] {
    if (!this.isInitialized) {
      return [];
    }

    const searchTerms = query.toLowerCase().split(/\s+/).filter(term => term.length > 2);
    const results: SearchResult[] = [];

    for (const [id, entry] of this.memory) {
      const relevanceScore = this.calculateRelevance(entry, searchTerms);
      
      if (relevanceScore > 0) {
        results.push({
          entry,
          relevanceScore,
          matchedTerms: this.findMatchedTerms(entry, searchTerms)
        });
      }
    }

    // Sort by relevance and priority
    results.sort((a, b) => {
      const scoreA = a.relevanceScore + (a.entry.priority / 10);
      const scoreB = b.relevanceScore + (b.entry.priority / 10);
      return scoreB - scoreA;
    });

    return results.slice(0, maxResults);
  }

  /**
   * Calculate relevance score for an entry
   */
  private calculateRelevance(entry: MemoryEntry, searchTerms: string[]): number {
    let score = 0;
    const entryText = (entry.title + ' ' + entry.content + ' ' + entry.tags.join(' ')).toLowerCase();

    for (const term of searchTerms) {
      // Title matches are more important
      if (entry.title?.toLowerCase().includes(term)) {
        score += 3;
      }
      // Tag matches
      if (entry.tags.some(tag => tag.includes(term))) {
        score += 2;
      }
      // Content matches
      if (entry.content.toLowerCase().includes(term)) {
        score += 1;
      }
    }

    return score;
  }

  /**
   * Find matched terms in entry
   */
  private findMatchedTerms(entry: MemoryEntry, searchTerms: string[]): string[] {
    const matched: string[] = [];
    const entryText = (entry.title + ' ' + entry.content).toLowerCase();

    for (const term of searchTerms) {
      if (entryText.includes(term)) {
        matched.push(term);
      }
    }

    return matched;
  }

  /**
   * Get contextual response for fallback scenarios
   */
  public getContextualFallback(prompt: string): string {
    const searchResults = this.search(prompt, 2);
    
    if (searchResults.length > 0) {
      const topResult = searchResults[0];
      return `💡 Based on the OMAI Operators Manual, here's relevant information:

**${topResult.entry.title}**
${topResult.entry.content.substring(0, 300)}...

💬 For more details, check the full Operators Manual or ask me something more specific!`;
    }

    return this.getDefaultFallback(prompt);
  }

  /**
   * Generate default fallback response
   */
  private getDefaultFallback(prompt: string): string {
    if (/weather/i.test(prompt)) {
      return "🌤️ I don't currently have weather API access, but I can help you debug your OrthodoxMetrics system!";
    }
    
    if (/joke|funny|humor/i.test(prompt)) {
      return "😂 OrthodoxMetrics isn't funny... but I can debug your database with a smile! 🐛→✨";
    }
    
    if (/love|like|feel/i.test(prompt)) {
      return "💙 I feel most alive when optimizing your SQL queries and fixing frontend bugs! How can I help?";
    }

    return "🤔 I'm not sure how to answer that yet — check my Operators Manual or provide more details about what you need!";
  }

  /**
   * Create fallback entries if manual is missing
   */
  private async createFallbackEntries(): Promise<void> {
    const fallbackEntries = [
      {
        title: 'OMAI Commands',
        content: 'Available commands: status, health, autofix, agents, learning refresh',
        section: 'Quick Reference',
        category: 'commands',
        tags: ['commands', 'quick-reference'],
        priority: 8
      },
      {
        title: 'Troubleshooting',
        content: 'Check logs, run diagnostics, verify permissions, restart services',
        section: 'Help',
        category: 'troubleshooting',
        tags: ['troubleshooting', 'help'],
        priority: 7
      }
    ];

    for (const entry of fallbackEntries) {
      await this.addMemoryEntry(entry);
    }
  }

  /**
   * Generate unique ID for memory entry
   */
  private generateId(title: string, section: string): string {
    const base = `${section}_${title}`.toLowerCase().replace(/[^a-z0-9]/g, '_');
    return `${base}_${Date.now()}`;
  }

  /**
   * Get memory statistics
   */
  public getStats(): { totalEntries: number; categories: number; tags: number } {
    return {
      totalEntries: this.memory.size,
      categories: this.categoryIndex.size,
      tags: this.tagIndex.size
    };
  }
}

// Export singleton instance
export const memoryCore = new OMAIMemoryCore(); 