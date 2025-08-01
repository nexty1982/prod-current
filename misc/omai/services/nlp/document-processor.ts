import { v4 as uuidv4 } from 'uuid';
import fs from 'fs/promises';
import path from 'path';

export interface Document {
  id: string;
  title: string;
  content: string;
  type: 'text' | 'markdown' | 'html' | 'json' | 'xml';
  source: string;
  metadata: DocumentMetadata;
  processedAt: string;
  analysis?: DocumentAnalysis;
}

export interface DocumentMetadata {
  size: number;
  language: string;
  encoding: string;
  created: string;
  modified: string;
  author?: string;
  tags: string[];
  categories: string[];
}

export interface DocumentAnalysis {
  id: string;
  documentId: string;
  summary: string;
  keyPoints: string[];
  topics: Topic[];
  entities: DocumentEntity[];
  sentiment: DocumentSentiment;
  readability: ReadabilityMetrics;
  structure: DocumentStructure;
  timestamp: string;
}

export interface Topic {
  name: string;
  confidence: number;
  keywords: string[];
  frequency: number;
}

export interface DocumentEntity {
  text: string;
  type: 'person' | 'organization' | 'location' | 'date' | 'concept' | 'technical';
  confidence: number;
  occurrences: number;
  context: string[];
}

export interface DocumentSentiment {
  overall: 'positive' | 'negative' | 'neutral';
  score: number;
  sections: SentimentSection[];
  trends: SentimentTrend[];
}

export interface SentimentSection {
  text: string;
  sentiment: 'positive' | 'negative' | 'neutral';
  score: number;
  startIndex: number;
  endIndex: number;
}

export interface SentimentTrend {
  section: string;
  trend: 'improving' | 'declining' | 'stable';
  confidence: number;
}

export interface ReadabilityMetrics {
  fleschKincaid: number;
  gunningFog: number;
  smog: number;
  colemanLiau: number;
  automatedReadability: number;
  averageGrade: number;
  complexity: 'simple' | 'moderate' | 'complex';
}

export interface DocumentStructure {
  sections: DocumentSection[];
  headings: Heading[];
  paragraphs: number;
  sentences: number;
  words: number;
  characters: number;
}

export interface DocumentSection {
  title: string;
  content: string;
  level: number;
  startIndex: number;
  endIndex: number;
  subsections: DocumentSection[];
}

export interface Heading {
  text: string;
  level: number;
  position: number;
  id: string;
}

export interface DocumentProcessor {
  processDocument(content: string, title: string, type: string, source: string): Promise<Document>;
  analyzeDocument(documentId: string): Promise<DocumentAnalysis>;
  extractText(document: Document): Promise<string>;
  generateSummary(document: Document): Promise<string>;
  extractKeyPoints(document: Document): Promise<string[]>;
  identifyTopics(document: Document): Promise<Topic[]>;
  extractEntities(document: Document): Promise<DocumentEntity[]>;
  analyzeSentiment(document: Document): Promise<DocumentSentiment>;
  calculateReadability(document: Document): Promise<ReadabilityMetrics>;
  analyzeStructure(document: Document): Promise<DocumentStructure>;
  searchDocuments(query: string, filters?: any): Promise<Document[]>;
  getDocument(documentId: string): Promise<Document | null>;
  listDocuments(filters?: any): Promise<Document[]>;
  updateDocument(documentId: string, updates: Partial<Document>): Promise<void>;
  deleteDocument(documentId: string): Promise<void>;
}

export class OMIDocumentProcessor implements DocumentProcessor {
  private dataDir: string;
  private documentsFile: string;
  private analysesFile: string;

  constructor() {
    this.dataDir = path.join(process.cwd(), 'data', 'om-ai', 'nlp');
    this.documentsFile = path.join(this.dataDir, 'documents.json');
    this.analysesFile = path.join(this.dataDir, 'document-analyses.json');
    this.ensureDataDir();
  }

  private async ensureDataDir(): Promise<void> {
    try {
      await fs.mkdir(this.dataDir, { recursive: true });
    } catch (error) {
      console.error('Error creating NLP data directory:', error);
    }
  }

  async processDocument(content: string, title: string, type: string, source: string): Promise<Document> {
    try {
      const document: Document = {
        id: uuidv4(),
        title,
        content,
        type: type as 'text' | 'markdown' | 'html' | 'json' | 'xml',
        source,
        metadata: {
          size: content.length,
          language: this.detectLanguage(content),
          encoding: 'utf-8',
          created: new Date().toISOString(),
          modified: new Date().toISOString(),
          tags: [],
          categories: []
        },
        processedAt: new Date().toISOString()
      };

      const documents = await this.getDocuments();
      documents.push(document);
      await fs.writeFile(this.documentsFile, JSON.stringify(documents, null, 2));

      return document;
    } catch (error) {
      console.error('Error processing document:', error);
      throw error;
    }
  }

  async analyzeDocument(documentId: string): Promise<DocumentAnalysis> {
    try {
      const document = await this.getDocument(documentId);
      if (!document) {
        throw new Error(`Document ${documentId} not found`);
      }

      const summary = await this.generateSummary(document);
      const keyPoints = await this.extractKeyPoints(document);
      const topics = await this.identifyTopics(document);
      const entities = await this.extractEntities(document);
      const sentiment = await this.analyzeSentiment(document);
      const readability = await this.calculateReadability(document);
      const structure = await this.analyzeStructure(document);

      const analysis: DocumentAnalysis = {
        id: uuidv4(),
        documentId,
        summary,
        keyPoints,
        topics,
        entities,
        sentiment,
        readability,
        structure,
        timestamp: new Date().toISOString()
      };

      // Update document with analysis
      document.analysis = analysis;
      await this.updateDocument(documentId, { analysis });

      // Save analysis
      const analyses = await this.getAnalyses();
      analyses.push(analysis);
      await fs.writeFile(this.analysesFile, JSON.stringify(analyses, null, 2));

      return analysis;
    } catch (error) {
      console.error('Error analyzing document:', error);
      throw error;
    }
  }

  async extractText(document: Document): Promise<string> {
    try {
      // Basic text extraction based on document type
      switch (document.type) {
        case 'text':
          return document.content;
        case 'markdown':
          return this.extractTextFromMarkdown(document.content);
        case 'html':
          return this.extractTextFromHTML(document.content);
        case 'json':
          return this.extractTextFromJSON(document.content);
        case 'xml':
          return this.extractTextFromXML(document.content);
        default:
          return document.content;
      }
    } catch (error) {
      console.error('Error extracting text:', error);
      return document.content;
    }
  }

  async generateSummary(document: Document): Promise<string> {
    try {
      const text = await this.extractText(document);
      const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
      
      // Simple extractive summarization
      const wordFreq: { [key: string]: number } = {};
      const words = text.toLowerCase().split(/\s+/);
      
      for (const word of words) {
        const cleanWord = word.replace(/[^\w]/g, '');
        if (cleanWord.length > 2) {
          wordFreq[cleanWord] = (wordFreq[cleanWord] || 0) + 1;
        }
      }
      
      // Score sentences based on word frequency
      const sentenceScores = sentences.map(sentence => {
        const sentenceWords = sentence.toLowerCase().split(/\s+/);
        const score = sentenceWords.reduce((sum, word) => {
          const cleanWord = word.replace(/[^\w]/g, '');
          return sum + (wordFreq[cleanWord] || 0);
        }, 0);
        return { sentence, score };
      });
      
      // Get top sentences
      const topSentences = sentenceScores
        .sort((a, b) => b.score - a.score)
        .slice(0, Math.min(3, sentences.length))
        .map(item => item.sentence.trim());
      
      return topSentences.join('. ') + '.';
    } catch (error) {
      console.error('Error generating summary:', error);
      return 'Summary generation failed.';
    }
  }

  async extractKeyPoints(document: Document): Promise<string[]> {
    try {
      const text = await this.extractText(document);
      const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
      
      // Extract key points based on sentence characteristics
      const keyPoints: string[] = [];
      
      for (const sentence of sentences) {
        const trimmed = sentence.trim();
        if (trimmed.length > 20 && trimmed.length < 200) {
          // Look for sentences that might be key points
          if (trimmed.includes('important') || 
              trimmed.includes('key') || 
              trimmed.includes('main') || 
              trimmed.includes('primary') ||
              trimmed.includes('essential') ||
              trimmed.includes('critical')) {
            keyPoints.push(trimmed);
          }
        }
      }
      
      // If no obvious key points found, take first few meaningful sentences
      if (keyPoints.length === 0) {
        const meaningfulSentences = sentences
          .filter(s => s.trim().length > 30)
          .slice(0, 5);
        keyPoints.push(...meaningfulSentences.map(s => s.trim()));
      }
      
      return keyPoints.slice(0, 10);
    } catch (error) {
      console.error('Error extracting key points:', error);
      return [];
    }
  }

  async identifyTopics(document: Document): Promise<Topic[]> {
    try {
      const text = await this.extractText(document);
      const words = text.toLowerCase().split(/\s+/);
      const wordFreq: { [key: string]: number } = {};
      
      // Count word frequencies
      for (const word of words) {
        const cleanWord = word.replace(/[^\w]/g, '');
        if (cleanWord.length > 3) {
          wordFreq[cleanWord] = (wordFreq[cleanWord] || 0) + 1;
        }
      }
      
      // Identify potential topics based on frequency and patterns
      const topics: Topic[] = [];
      const commonWords = Object.entries(wordFreq)
        .filter(([word, freq]) => freq > 2 && word.length > 4)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);
      
      for (const [word, frequency] of commonWords) {
        topics.push({
          name: word,
          confidence: Math.min(0.9, frequency / 10),
          keywords: [word],
          frequency
        });
      }
      
      return topics;
    } catch (error) {
      console.error('Error identifying topics:', error);
      return [];
    }
  }

  async extractEntities(document: Document): Promise<DocumentEntity[]> {
    try {
      const text = await this.extractText(document);
      const entities: DocumentEntity[] = [];
      
      // Basic entity extraction
      const sentences = text.split(/[.!?]+/);
      
      for (const sentence of sentences) {
        const words = sentence.split(/\s+/);
        
        for (const word of words) {
          const cleanWord = word.replace(/[^\w]/g, '');
          
          if (/^\d+$/.test(cleanWord)) {
            entities.push({
              text: cleanWord,
              type: 'date',
              confidence: 0.8,
              occurrences: 1,
              context: [sentence.trim()]
            });
          } else if (/^[A-Z][a-z]+$/.test(cleanWord)) {
            entities.push({
              text: cleanWord,
              type: 'person',
              confidence: 0.7,
              occurrences: 1,
              context: [sentence.trim()]
            });
          } else if (cleanWord.length > 5 && /^[A-Z]/.test(cleanWord)) {
            entities.push({
              text: cleanWord,
              type: 'organization',
              confidence: 0.6,
              occurrences: 1,
              context: [sentence.trim()]
            });
          }
        }
      }
      
      // Consolidate duplicate entities
      const entityMap = new Map<string, DocumentEntity>();
      for (const entity of entities) {
        const key = `${entity.text}-${entity.type}`;
        if (entityMap.has(key)) {
          const existing = entityMap.get(key)!;
          existing.occurrences++;
          existing.context.push(...entity.context);
        } else {
          entityMap.set(key, entity);
        }
      }
      
      return Array.from(entityMap.values());
    } catch (error) {
      console.error('Error extracting entities:', error);
      return [];
    }
  }

  async analyzeSentiment(document: Document): Promise<DocumentSentiment> {
    try {
      const text = await this.extractText(document);
      const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
      
      let overallScore = 0;
      const sections: SentimentSection[] = [];
      
      for (let i = 0; i < sentences.length; i++) {
        const sentence = sentences[i].trim();
        const sentiment = this.analyzeSentenceSentiment(sentence);
        const score = sentiment.score;
        
        overallScore += score;
        
        sections.push({
          text: sentence,
          sentiment: sentiment.overall,
          score,
          startIndex: text.indexOf(sentence),
          endIndex: text.indexOf(sentence) + sentence.length
        });
      }
      
      const averageScore = sentences.length > 0 ? overallScore / sentences.length : 0;
      const overall = averageScore > 0.1 ? 'positive' : averageScore < -0.1 ? 'negative' : 'neutral';
      
      return {
        overall,
        score: averageScore,
        sections,
        trends: []
      };
    } catch (error) {
      console.error('Error analyzing sentiment:', error);
      return {
        overall: 'neutral',
        score: 0,
        sections: [],
        trends: []
      };
    }
  }

  async calculateReadability(document: Document): Promise<ReadabilityMetrics> {
    try {
      const text = await this.extractText(document);
      const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
      const words = text.split(/\s+/).filter(w => w.length > 0);
      const syllables = this.countSyllables(text);
      
      const fleschKincaid = 206.835 - (1.015 * (words.length / sentences.length)) - (84.6 * (syllables / words.length));
      const gunningFog = 0.4 * ((words.length / sentences.length) + (100 * this.countComplexWords(words) / words.length));
      const smog = 1.043 * Math.sqrt(this.countComplexWords(words) * (30 / sentences.length)) + 3.1291;
      const colemanLiau = 0.0588 * (words.length / sentences.length * 100) - 0.296 * (syllables / words.length * 100) - 15.8;
      const automatedReadability = 4.71 * (words.length / sentences.length) + 0.5 * (words.length / syllables) - 21.43;
      
      const averageGrade = (fleschKincaid + gunningFog + smog + colemanLiau + automatedReadability) / 5;
      const complexity = averageGrade < 8 ? 'simple' : averageGrade < 12 ? 'moderate' : 'complex';
      
      return {
        fleschKincaid,
        gunningFog,
        smog,
        colemanLiau,
        automatedReadability,
        averageGrade,
        complexity
      };
    } catch (error) {
      console.error('Error calculating readability:', error);
      return {
        fleschKincaid: 0,
        gunningFog: 0,
        smog: 0,
        colemanLiau: 0,
        automatedReadability: 0,
        averageGrade: 0,
        complexity: 'moderate'
      };
    }
  }

  async analyzeStructure(document: Document): Promise<DocumentStructure> {
    try {
      const text = await this.extractText(document);
      const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 0);
      const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
      const words = text.split(/\s+/).filter(w => w.length > 0);
      const characters = text.length;
      
      // Extract headings (basic implementation)
      const headings: Heading[] = [];
      const lines = text.split('\n');
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line.startsWith('#') || line.startsWith('##') || line.startsWith('###')) {
          const level = line.match(/^#+/)?.[0].length || 1;
          const headingText = line.replace(/^#+\s*/, '');
          headings.push({
            text: headingText,
            level,
            position: i,
            id: `heading-${i}`
          });
        }
      }
      
      // Create sections based on headings
      const sections: DocumentSection[] = [];
      for (let i = 0; i < headings.length; i++) {
        const heading = headings[i];
        const nextHeading = headings[i + 1];
        
        const startIndex = text.indexOf(heading.text);
        const endIndex = nextHeading ? text.indexOf(nextHeading.text) : text.length;
        const content = text.substring(startIndex, endIndex);
        
        sections.push({
          title: heading.text,
          content,
          level: heading.level,
          startIndex,
          endIndex,
          subsections: []
        });
      }
      
      return {
        sections,
        headings,
        paragraphs: paragraphs.length,
        sentences: sentences.length,
        words: words.length,
        characters
      };
    } catch (error) {
      console.error('Error analyzing structure:', error);
      return {
        sections: [],
        headings: [],
        paragraphs: 0,
        sentences: 0,
        words: 0,
        characters: 0
      };
    }
  }

  async searchDocuments(query: string, filters?: any): Promise<Document[]> {
    try {
      const documents = await this.getDocuments();
      const results: Document[] = [];
      
      for (const document of documents) {
        if (document.title.toLowerCase().includes(query.toLowerCase()) ||
            document.content.toLowerCase().includes(query.toLowerCase())) {
          results.push(document);
        }
      }
      
      return results;
    } catch (error) {
      console.error('Error searching documents:', error);
      return [];
    }
  }

  async getDocument(documentId: string): Promise<Document | null> {
    try {
      const documents = await this.getDocuments();
      return documents.find(d => d.id === documentId) || null;
    } catch (error) {
      console.error('Error getting document:', error);
      return null;
    }
  }

  async listDocuments(filters?: any): Promise<Document[]> {
    try {
      return await this.getDocuments();
    } catch (error) {
      console.error('Error listing documents:', error);
      return [];
    }
  }

  async updateDocument(documentId: string, updates: Partial<Document>): Promise<void> {
    try {
      const documents = await this.getDocuments();
      const documentIndex = documents.findIndex(d => d.id === documentId);
      
      if (documentIndex !== -1) {
        documents[documentIndex] = { ...documents[documentIndex], ...updates };
        await fs.writeFile(this.documentsFile, JSON.stringify(documents, null, 2));
      }
    } catch (error) {
      console.error('Error updating document:', error);
      throw error;
    }
  }

  async deleteDocument(documentId: string): Promise<void> {
    try {
      const documents = await this.getDocuments();
      const filteredDocuments = documents.filter(d => d.id !== documentId);
      await fs.writeFile(this.documentsFile, JSON.stringify(filteredDocuments, null, 2));
    } catch (error) {
      console.error('Error deleting document:', error);
      throw error;
    }
  }

  private detectLanguage(text: string): string {
    // Basic language detection (simplified)
    return 'en';
  }

  private extractTextFromMarkdown(content: string): string {
    return content.replace(/[#*`\[\]()]/g, '').replace(/\n+/g, ' ');
  }

  private extractTextFromHTML(content: string): string {
    return content.replace(/<[^>]*>/g, '').replace(/\n+/g, ' ');
  }

  private extractTextFromJSON(content: string): string {
    try {
      const parsed = JSON.parse(content);
      return JSON.stringify(parsed, null, 2);
    } catch {
      return content;
    }
  }

  private extractTextFromXML(content: string): string {
    return content.replace(/<[^>]*>/g, '').replace(/\n+/g, ' ');
  }

  private analyzeSentenceSentiment(sentence: string): { overall: 'positive' | 'negative' | 'neutral', score: number } {
    const lowerSentence = sentence.toLowerCase();
    const positiveWords = ['good', 'great', 'excellent', 'amazing', 'wonderful', 'happy', 'love', 'like', 'positive'];
    const negativeWords = ['bad', 'terrible', 'awful', 'hate', 'dislike', 'sad', 'angry', 'frustrated', 'negative'];
    
    let positiveCount = 0;
    let negativeCount = 0;
    
    for (const word of positiveWords) {
      if (lowerSentence.includes(word)) positiveCount++;
    }
    
    for (const word of negativeWords) {
      if (lowerSentence.includes(word)) negativeCount++;
    }
    
    const score = (positiveCount - negativeCount) / Math.max(positiveCount + negativeCount, 1);
    
    if (score > 0.1) return { overall: 'positive', score };
    if (score < -0.1) return { overall: 'negative', score };
    return { overall: 'neutral', score };
  }

  private countSyllables(text: string): number {
    // Simplified syllable counting
    const words = text.toLowerCase().split(/\s+/);
    let count = 0;
    
    for (const word of words) {
      const cleanWord = word.replace(/[^\w]/g, '');
      if (cleanWord.length <= 3) {
        count += 1;
      } else {
        count += Math.ceil(cleanWord.length / 3);
      }
    }
    
    return count;
  }

  private countComplexWords(words: string[]): number {
    let count = 0;
    
    for (const word of words) {
      const cleanWord = word.replace(/[^\w]/g, '');
      if (cleanWord.length > 6) {
        count++;
      }
    }
    
    return count;
  }

  private async getDocuments(): Promise<Document[]> {
    try {
      const data = await fs.readFile(this.documentsFile, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      return [];
    }
  }

  private async getAnalyses(): Promise<DocumentAnalysis[]> {
    try {
      const data = await fs.readFile(this.analysesFile, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      return [];
    }
  }
}

export const documentProcessor = new OMIDocumentProcessor(); 