import { OMAIConfig } from '../config';
import { SearchQuery, SearchResult, EmbeddingEntry } from '../types';
import * as fs from 'fs/promises';
import * as path from 'path';
import { getRelevantContext } from '../memory/memory-manager';
import { logger } from '../utils/logger';

// Enhanced vector store with better similarity calculation
class EnhancedVectorStore {
  private embeddings: EmbeddingEntry[] = [];
  private loaded = false;

  async load() {
    if (this.loaded) return;
    
    try {
      const data = await fs.readFile(OMAIConfig.embeddingsPath, 'utf8');
      this.embeddings = JSON.parse(data);
      this.loaded = true;
      logger.info('Vector store loaded', { embeddingsCount: this.embeddings.length });
    } catch (error) {
      logger.warn('No embeddings file found, starting with empty store');
      this.embeddings = [];
      this.loaded = true;
    }
  }

  async save() {
    try {
      // Ensure directory exists
      const dir = path.dirname(OMAIConfig.embeddingsPath);
      await fs.mkdir(dir, { recursive: true });
      
      await fs.writeFile(OMAIConfig.embeddingsPath, JSON.stringify(this.embeddings, null, 2));
      logger.info('Vector store saved', { embeddingsCount: this.embeddings.length });
    } catch (error) {
      logger.error('Failed to save vector store', { error: error instanceof Error ? error.message : 'Unknown error' });
      throw error;
    }
  }

  async addEmbedding(entry: EmbeddingEntry) {
    await this.load();
    this.embeddings.push(entry);
    await this.save();
  }

  async search(query: string, limit: number = 5, threshold: number = 0.7): Promise<SearchResult[]> {
    await this.load();
    
    const results: SearchResult[] = [];
    
    for (const embedding of this.embeddings) {
      const similarity = this.calculateEnhancedSimilarity(query, embedding.content);
      
      if (similarity >= threshold) {
        results.push({
          id: embedding.id,
          content: embedding.content,
          similarity,
          metadata: embedding.metadata
        });
      }
    }
    
    // Sort by similarity and limit results
    return results
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);
  }

  private calculateEnhancedSimilarity(query: string, content: string): number {
    const queryWords = query.toLowerCase().split(/\s+/).filter(word => word.length > 2);
    const contentWords = content.toLowerCase().split(/\s+/).filter(word => word.length > 2);
    
    if (queryWords.length === 0 || contentWords.length === 0) {
      return 0;
    }

    // Calculate multiple similarity metrics
    const jaccardSimilarity = this.calculateJaccardSimilarity(queryWords, contentWords);
    const cosineSimilarity = this.calculateCosineSimilarity(queryWords, contentWords);
    const exactMatchBonus = this.calculateExactMatchBonus(query, content);
    
    // Weighted combination of similarity metrics
    const weightedSimilarity = (jaccardSimilarity * 0.4) + (cosineSimilarity * 0.4) + (exactMatchBonus * 0.2);
    
    return Math.min(weightedSimilarity, 1.0);
  }

  private calculateJaccardSimilarity(queryWords: string[], contentWords: string[]): number {
    const querySet = new Set(queryWords);
    const contentSet = new Set(contentWords);
    
    const intersection = new Set([...querySet].filter(x => contentSet.has(x)));
    const union = new Set([...querySet, ...contentSet]);
    
    return union.size > 0 ? intersection.size / union.size : 0;
  }

  private calculateCosineSimilarity(queryWords: string[], contentWords: string[]): number {
    const wordFreq: Record<string, number> = {};
    
    // Count word frequencies
    queryWords.forEach(word => {
      wordFreq[word] = (wordFreq[word] || 0) + 1;
    });
    
    contentWords.forEach(word => {
      wordFreq[word] = (wordFreq[word] || 0) + 1;
    });
    
    // Calculate dot product and magnitudes
    let dotProduct = 0;
    let queryMagnitude = 0;
    let contentMagnitude = 0;
    
    queryWords.forEach(word => {
      const queryFreq = queryWords.filter(w => w === word).length;
      const contentFreq = contentWords.filter(w => w === word).length;
      dotProduct += queryFreq * contentFreq;
      queryMagnitude += queryFreq * queryFreq;
    });
    
    contentWords.forEach(word => {
      const contentFreq = contentWords.filter(w => w === word).length;
      contentMagnitude += contentFreq * contentFreq;
    });
    
    const magnitude = Math.sqrt(queryMagnitude) * Math.sqrt(contentMagnitude);
    return magnitude > 0 ? dotProduct / magnitude : 0;
  }

  private calculateExactMatchBonus(query: string, content: string): number {
    const queryLower = query.toLowerCase();
    const contentLower = content.toLowerCase();
    
    // Check for exact phrase matches
    if (contentLower.includes(queryLower)) {
      return 0.3;
    }
    
    // Check for significant word matches
    const queryWords = queryLower.split(/\s+/).filter(word => word.length > 3);
    const contentWords = contentLower.split(/\s+/).filter(word => word.length > 3);
    
    const matches = queryWords.filter(word => contentWords.includes(word));
    return matches.length / Math.max(queryWords.length, 1) * 0.2;
  }

  async getStats(): Promise<{
    totalEmbeddings: number;
    sources: string[];
    lastUpdated: Date;
  }> {
    await this.load();
    
    const sources = [...new Set(this.embeddings.map(e => e.metadata.source))];
    const lastUpdated = this.embeddings.length > 0 
      ? new Date(Math.max(...this.embeddings.map(e => e.metadata.timestamp.getTime())))
      : new Date();
    
    return {
      totalEmbeddings: this.embeddings.length,
      sources,
      lastUpdated
    };
  }
}

const vectorStore = new EnhancedVectorStore();

export async function getContextForPrompt(prompt: string): Promise<{
  context: string[];
  sources: string[];
  memoryContext: string[];
}> {
  const searchQuery: SearchQuery = {
    text: prompt,
    limit: OMAIConfig.maxResults,
    threshold: OMAIConfig.similarityThreshold
  };
  
  // Get vector search results
  const vectorResults = await vectorStore.search(
    searchQuery.text,
    searchQuery.limit || OMAIConfig.maxResults,
    searchQuery.threshold || OMAIConfig.similarityThreshold
  );
  
  // Get memory context
  const memoryContext = await getRelevantContext(prompt);
  
  // Combine and format results
  const context = vectorResults.map(result => result.content);
  const sources = vectorResults.map(result => result.metadata.source);
  
  logger.info('Context retrieved', { 
    vectorResults: vectorResults.length,
    memoryContext: memoryContext.length,
    sources: sources.length 
  });
  
  return {
    context,
    sources,
    memoryContext
  };
}

export async function addToEmbeddings(content: string, metadata: any): Promise<void> {
  const entry: EmbeddingEntry = {
    id: `embedding_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    content,
    embedding: [], // Placeholder for actual embeddings
    metadata: {
      source: metadata.source || 'unknown',
      fileType: metadata.fileType || 'text',
      timestamp: new Date(),
      tags: metadata.tags || []
    }
  };
  
  await vectorStore.addEmbedding(entry);
}

export async function searchEmbeddings(query: SearchQuery): Promise<SearchResult[]> {
  return await vectorStore.search(
    query.text,
    query.limit || OMAIConfig.maxResults,
    query.threshold || OMAIConfig.similarityThreshold
  );
}

export async function getEmbeddingsStats(): Promise<{
  totalEmbeddings: number;
  lastUpdated: Date;
  sources: string[];
}> {
  await vectorStore.load();
  
  const sources = [...new Set(vectorStore['embeddings'].map(e => e.metadata.source))];
  const lastUpdated = vectorStore['embeddings'].length > 0 
    ? new Date(Math.max(...vectorStore['embeddings'].map(e => e.metadata.timestamp.getTime())))
    : new Date();
  
  return {
    totalEmbeddings: vectorStore['embeddings'].length,
    lastUpdated,
    sources
  };
} 