import * as fs from 'fs/promises';
import * as path from 'path';

interface SearchQuery {
  query: string;
  filters?: {
    category?: string;
    fileType?: string;
    tags?: string[];
    dateRange?: {
      start: Date;
      end: Date;
    };
  };
  limit?: number;
  offset?: number;
}

interface SearchResult {
  id: string;
  content: string;
  metadata: any;
  score: number;
  highlights: string[];
  category: string;
  tags: string[];
}

interface SearchResponse {
  results: SearchResult[];
  total: number;
  query: string;
  duration: number;
  suggestions?: string[];
}

/**
 * Query Engine - Implements search logic using canonical headers, embeddings, and full text
 */
export class QueryEngine {
  private index: Map<string, any> = new Map();
  private embeddings: Map<string, number[]> = new Map();
  private categories: Map<string, string[]> = new Map();

  constructor() {
    this.loadIndex();
  }

  /**
   * Implement search logic using canonical headers, embeddings, and full text
   */
  async search(query: SearchQuery): Promise<SearchResponse> {
    const startTime = Date.now();
    
    try {
      console.log(`Searching for: ${query.query}`);
      
      // Parse and normalize the query
      const normalizedQuery = this.normalizeQuery(query.query);
      const queryTokens = this.tokenize(normalizedQuery);
      
      // Perform different types of searches
      const [keywordResults, semanticResults, headerResults] = await Promise.all([
        this.keywordSearch(queryTokens, query.filters),
        this.semanticSearch(normalizedQuery, query.filters),
        this.headerSearch(queryTokens, query.filters)
      ]);
      
      // Implement ranking logic
      const rankedResults = this.rankResults(
        keywordResults,
        semanticResults,
        headerResults,
        queryTokens
      );
      
      // Apply pagination
      const paginatedResults = this.paginateResults(
        rankedResults,
        query.limit || 10,
        query.offset || 0
      );
      
      // Compose a response from ranked results
      const response = this.composeResponse(
        paginatedResults,
        query.query,
        Date.now() - startTime,
        rankedResults.length
      );
      
      // Write to /logs/omai/query.log
      await this.logQuery(query, response);
      
      return response;
      
    } catch (error) {
      console.error('Search failed:', error);
      await this.logQuery(query, { error: error.message });
      
      return {
        results: [],
        total: 0,
        query: query.query,
        duration: Date.now() - startTime,
        error: error.message
      };
    }
  }

  /**
   * Implement ranking logic
   */
  private rankResults(
    keywordResults: SearchResult[],
    semanticResults: SearchResult[],
    headerResults: SearchResult[],
    queryTokens: string[]
  ): SearchResult[] {
    const allResults = new Map<string, SearchResult>();
    
    // Combine results from different search methods
    const addResults = (results: SearchResult[], weight: number) => {
      results.forEach(result => {
        if (allResults.has(result.id)) {
          allResults.get(result.id)!.score += result.score * weight;
        } else {
          allResults.set(result.id, { ...result, score: result.score * weight });
        }
      });
    };
    
    // Weight different search methods
    addResults(keywordResults, 0.4); // Keyword search gets highest weight
    addResults(semanticResults, 0.35); // Semantic search gets medium weight
    addResults(headerResults, 0.25); // Header search gets lower weight
    
    // Apply additional ranking factors
    const rankedResults = Array.from(allResults.values()).map(result => {
      let finalScore = result.score;
      
      // Boost exact matches
      if (this.hasExactMatch(result.content, queryTokens)) {
        finalScore *= 1.5;
      }
      
      // Boost recent content
      if (result.metadata.lastModified) {
        const daysSinceModified = (Date.now() - new Date(result.metadata.lastModified).getTime()) / (1000 * 60 * 60 * 24);
        if (daysSinceModified < 30) {
          finalScore *= 1.2;
        }
      }
      
      // Boost by category relevance
      if (this.isCategoryRelevant(result.category, queryTokens)) {
        finalScore *= 1.1;
      }
      
      return { ...result, score: finalScore };
    });
    
    // Sort by score (descending)
    return rankedResults.sort((a, b) => b.score - a.score);
  }

  /**
   * Keyword search implementation
   */
  private async keywordSearch(tokens: string[], filters?: any): Promise<SearchResult[]> {
    const results: SearchResult[] = [];
    
    for (const [id, chunk] of this.index) {
      if (this.matchesFilters(chunk, filters)) {
        const score = this.calculateKeywordScore(chunk.content, tokens);
        if (score > 0) {
          results.push({
            id,
            content: chunk.content,
            metadata: chunk.metadata,
            score,
            highlights: this.findHighlights(chunk.content, tokens),
            category: chunk.category,
            tags: chunk.tags
          });
        }
      }
    }
    
    return results;
  }

  /**
   * Semantic search implementation
   */
  private async semanticSearch(query: string, filters?: any): Promise<SearchResult[]> {
    const results: SearchResult[] = [];
    
    // Generate query embedding
    const queryEmbedding = await this.generateEmbedding(query);
    
    for (const [id, chunk] of this.index) {
      if (this.matchesFilters(chunk, filters)) {
        const chunkEmbedding = this.embeddings.get(id);
        if (chunkEmbedding) {
          const similarity = this.calculateCosineSimilarity(queryEmbedding, chunkEmbedding);
          if (similarity > 0.3) { // Threshold for semantic similarity
            results.push({
              id,
              content: chunk.content,
              metadata: chunk.metadata,
              score: similarity,
              highlights: this.findSemanticHighlights(chunk.content, query),
              category: chunk.category,
              tags: chunk.tags
            });
          }
        }
      }
    }
    
    return results;
  }

  /**
   * Header search implementation
   */
  private async headerSearch(tokens: string[], filters?: any): Promise<SearchResult[]> {
    const results: SearchResult[] = [];
    
    for (const [id, chunk] of this.index) {
      if (this.matchesFilters(chunk, filters)) {
        const headerScore = this.calculateHeaderScore(chunk.metadata, tokens);
        if (headerScore > 0) {
          results.push({
            id,
            content: chunk.content,
            metadata: chunk.metadata,
            score: headerScore,
            highlights: this.findHeaderHighlights(chunk.metadata, tokens),
            category: chunk.category,
            tags: chunk.tags
          });
        }
      }
    }
    
    return results;
  }

  /**
   * Compose a response from ranked results
   */
  private composeResponse(
    results: SearchResult[],
    query: string,
    duration: number,
    total: number
  ): SearchResponse {
    // Generate search suggestions
    const suggestions = this.generateSuggestions(query, results);
    
    return {
      results,
      total,
      query,
      duration,
      suggestions
    };
  }

  /**
   * Generate search suggestions
   */
  private generateSuggestions(query: string, results: SearchResult[]): string[] {
    const suggestions: string[] = [];
    
    // Extract common terms from results
    const commonTerms = new Map<string, number>();
    results.forEach(result => {
      result.tags.forEach(tag => {
        commonTerms.set(tag, (commonTerms.get(tag) || 0) + 1);
      });
    });
    
    // Generate suggestions based on common terms
    const sortedTerms = Array.from(commonTerms.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
    
    sortedTerms.forEach(([term, count]) => {
      if (count > 1 && !query.toLowerCase().includes(term.toLowerCase())) {
        suggestions.push(`${query} ${term}`);
      }
    });
    
    return suggestions;
  }

  /**
   * Helper methods
   */
  private normalizeQuery(query: string): string {
    return query.toLowerCase().trim();
  }

  private tokenize(text: string): string[] {
    return text.split(/\s+/).filter(token => token.length > 2);
  }

  private calculateKeywordScore(content: string, tokens: string[]): number {
    const contentLower = content.toLowerCase();
    let score = 0;
    
    tokens.forEach(token => {
      const matches = (contentLower.match(new RegExp(token, 'g')) || []).length;
      score += matches * 0.1;
    });
    
    return score;
  }

  private calculateHeaderScore(metadata: any, tokens: string[]): number {
    let score = 0;
    const fileName = metadata.name.toLowerCase();
    const filePath = metadata.path.toLowerCase();
    
    tokens.forEach(token => {
      if (fileName.includes(token)) score += 2;
      if (filePath.includes(token)) score += 1;
    });
    
    return score;
  }

  private findHighlights(content: string, tokens: string[]): string[] {
    const highlights: string[] = [];
    const lines = content.split('\n');
    
    lines.forEach(line => {
      tokens.forEach(token => {
        if (line.toLowerCase().includes(token.toLowerCase())) {
          highlights.push(line.trim());
        }
      });
    });
    
    return highlights.slice(0, 3); // Limit to 3 highlights
  }

  private findSemanticHighlights(content: string, query: string): string[] {
    // Simple semantic highlighting - find sentences containing query terms
    const sentences = content.split(/[.!?]+/);
    return sentences
      .filter(sentence => 
        query.split(' ').some(word => 
          sentence.toLowerCase().includes(word.toLowerCase())
        )
      )
      .slice(0, 2)
      .map(s => s.trim());
  }

  private findHeaderHighlights(metadata: any, tokens: string[]): string[] {
    const highlights: string[] = [];
    
    if (metadata.name) {
      tokens.forEach(token => {
        if (metadata.name.toLowerCase().includes(token.toLowerCase())) {
          highlights.push(`File: ${metadata.name}`);
        }
      });
    }
    
    return highlights;
  }

  private hasExactMatch(content: string, tokens: string[]): boolean {
    const contentLower = content.toLowerCase();
    return tokens.some(token => contentLower.includes(token.toLowerCase()));
  }

  private isCategoryRelevant(category: string, tokens: string[]): boolean {
    const categoryLower = category.toLowerCase();
    return tokens.some(token => categoryLower.includes(token.toLowerCase()));
  }

  private matchesFilters(chunk: any, filters?: any): boolean {
    if (!filters) return true;
    
    if (filters.category && chunk.category !== filters.category) return false;
    if (filters.fileType && chunk.metadata.extension !== filters.fileType) return false;
    if (filters.tags && !filters.tags.some((tag: string) => chunk.tags.includes(tag))) return false;
    
    return true;
  }

  private paginateResults(results: SearchResult[], limit: number, offset: number): SearchResult[] {
    return results.slice(offset, offset + limit);
  }

  private async generateEmbedding(text: string): Promise<number[]> {
    // Simple hash-based embedding (same as in fileToKnowledge.ts)
    const hash = this.simpleHash(text);
    const embedding = new Array(384).fill(0);
    
    for (let i = 0; i < Math.min(hash.length, embedding.length); i++) {
      embedding[i] = (hash.charCodeAt(i % hash.length) - 32) / 95;
    }
    
    return embedding;
  }

  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }

  private calculateCosineSimilarity(vec1: number[], vec2: number[]): number {
    if (vec1.length !== vec2.length) return 0;
    
    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;
    
    for (let i = 0; i < vec1.length; i++) {
      dotProduct += vec1[i] * vec2[i];
      norm1 += vec1[i] * vec1[i];
      norm2 += vec2[i] * vec2[i];
    }
    
    if (norm1 === 0 || norm2 === 0) return 0;
    
    return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
  }

  private async loadIndex(): Promise<void> {
    try {
      // TODO: Load actual index from storage
      console.log('Loading search index...');
    } catch (error) {
      console.error('Failed to load search index:', error);
    }
  }

  /**
   * Write to /logs/omai/query.log
   */
  private async logQuery(query: SearchQuery, response: any): Promise<void> {
    try {
      const logDir = path.join(process.cwd(), 'logs', 'omai');
      await fs.mkdir(logDir, { recursive: true });
      
      const logFile = path.join(logDir, 'query.log');
      const timestamp = new Date().toISOString();
      const logEntry = `[${timestamp}] Query: "${query.query}" | Results: ${response.results?.length || 0} | Duration: ${response.duration || 0}ms\n`;
      
      await fs.appendFile(logFile, logEntry);
    } catch (error) {
      console.error('Failed to write query log:', error);
    }
  }
}

/**
 * Create a query engine instance
 */
export function createQueryEngine(): QueryEngine {
  return new QueryEngine();
} 