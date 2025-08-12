import { v4 as uuidv4 } from 'uuid';
import fs from 'fs/promises';
import path from 'path';
import { nlpEngine, NLPRequest, NLPResponse, NLPAnalysis } from '../nlp/nlp-engine';
import { conversationManager, Conversation, ConversationMessage } from '../nlp/conversation-manager';
import { documentProcessor, Document, DocumentAnalysis } from '../nlp/document-processor';

export interface NLPSession {
  id: string;
  userId: string;
  type: 'conversation' | 'document_analysis' | 'text_processing' | 'mixed';
  status: 'active' | 'paused' | 'completed' | 'error';
  startTime: string;
  endTime?: string;
  metadata: {
    conversationId?: string;
    documentIds?: string[];
    requestCount: number;
    averageResponseTime: number;
    lastActivity: string;
  };
}

export interface NLPReport {
  id: string;
  sessionId: string;
  type: 'conversation_summary' | 'document_analysis' | 'processing_metrics' | 'comprehensive';
  content: any;
  generatedAt: string;
  metadata?: any;
}

export interface NLPMetrics {
  totalRequests: number;
  averageResponseTime: number;
  successRate: number;
  activeSessions: number;
  totalConversations: number;
  totalDocuments: number;
  languageModels: number;
  lastUpdated: string;
}

export interface NLPController {
  // Session Management
  createSession(userId: string, type: string): Promise<NLPSession>;
  getSession(sessionId: string): Promise<NLPSession | null>;
  updateSession(sessionId: string, updates: Partial<NLPSession>): Promise<void>;
  endSession(sessionId: string): Promise<void>;
  listSessions(userId?: string): Promise<NLPSession[]>;
  
  // NLP Processing
  processTextRequest(sessionId: string, text: string, type: string): Promise<NLPResponse>;
  analyzeText(sessionId: string, text: string): Promise<NLPAnalysis>;
  generateResponse(sessionId: string, context: any, type: string): Promise<string>;
  
  // Conversation Management
  startConversation(sessionId: string, title: string, participants: string[]): Promise<Conversation>;
  sendMessage(sessionId: string, conversationId: string, sender: string, content: string): Promise<ConversationMessage>;
  getConversationHistory(sessionId: string, conversationId: string, limit?: number): Promise<ConversationMessage[]>;
  endConversation(sessionId: string, conversationId: string): Promise<void>;
  
  // Document Processing
  processDocument(sessionId: string, content: string, title: string, type: string, source: string): Promise<Document>;
  analyzeDocument(sessionId: string, documentId: string): Promise<DocumentAnalysis>;
  searchDocuments(sessionId: string, query: string, filters?: any): Promise<Document[]>;
  
  // Reporting and Metrics
  generateReport(sessionId: string, type: string): Promise<NLPReport>;
  getMetrics(): Promise<NLPMetrics>;
  getSessionMetrics(sessionId: string): Promise<any>;
  
  // Language Models
  getLanguageModels(): Promise<any[]>;
  updateLanguageModel(modelId: string, updates: any): Promise<void>;
}

export class OMINLPController implements NLPController {
  private dataDir: string;
  private sessionsFile: string;
  private reportsFile: string;
  private metricsFile: string;

  constructor() {
    this.dataDir = path.join(process.cwd(), 'data', 'om-ai', 'nlp');
    this.sessionsFile = path.join(this.dataDir, 'sessions.json');
    this.reportsFile = path.join(this.dataDir, 'reports.json');
    this.metricsFile = path.join(this.dataDir, 'metrics.json');
    this.ensureDataDir();
  }

  private async ensureDataDir(): Promise<void> {
    try {
      await fs.mkdir(this.dataDir, { recursive: true });
    } catch (error) {
      console.error('Error creating NLP data directory:', error);
    }
  }

  async createSession(userId: string, type: string): Promise<NLPSession> {
    try {
      const session: NLPSession = {
        id: uuidv4(),
        userId,
        type: type as 'conversation' | 'document_analysis' | 'text_processing' | 'mixed',
        status: 'active',
        startTime: new Date().toISOString(),
        metadata: {
          requestCount: 0,
          averageResponseTime: 0,
          lastActivity: new Date().toISOString()
        }
      };

      const sessions = await this.getSessions();
      sessions.push(session);
      await fs.writeFile(this.sessionsFile, JSON.stringify(sessions, null, 2));

      return session;
    } catch (error) {
      console.error('Error creating NLP session:', error);
      throw error;
    }
  }

  async getSession(sessionId: string): Promise<NLPSession | null> {
    try {
      const sessions = await this.getSessions();
      return sessions.find(s => s.id === sessionId) || null;
    } catch (error) {
      console.error('Error getting NLP session:', error);
      return null;
    }
  }

  async updateSession(sessionId: string, updates: Partial<NLPSession>): Promise<void> {
    try {
      const sessions = await this.getSessions();
      const sessionIndex = sessions.findIndex(s => s.id === sessionId);
      
      if (sessionIndex !== -1) {
        sessions[sessionIndex] = { ...sessions[sessionIndex], ...updates };
        await fs.writeFile(this.sessionsFile, JSON.stringify(sessions, null, 2));
      }
    } catch (error) {
      console.error('Error updating NLP session:', error);
      throw error;
    }
  }

  async endSession(sessionId: string): Promise<void> {
    try {
      await this.updateSession(sessionId, {
        status: 'completed',
        endTime: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error ending NLP session:', error);
      throw error;
    }
  }

  async listSessions(userId?: string): Promise<NLPSession[]> {
    try {
      const sessions = await this.getSessions();
      
      if (userId) {
        return sessions.filter(s => s.userId === userId);
      }
      
      return sessions;
    } catch (error) {
      console.error('Error listing NLP sessions:', error);
      return [];
    }
  }

  async processTextRequest(sessionId: string, text: string, type: string): Promise<NLPResponse> {
    try {
      const session = await this.getSession(sessionId);
      if (!session) {
        throw new Error(`Session ${sessionId} not found`);
      }

      const request: NLPRequest = {
        id: uuidv4(),
        text,
        type: type as 'understanding' | 'generation' | 'analysis' | 'conversation',
        timestamp: new Date().toISOString(),
        userId: session.userId
      };

      const response = await nlpEngine.processRequest(request);

      // Update session metrics
      session.metadata.requestCount++;
      session.metadata.lastActivity = new Date().toISOString();
      session.metadata.averageResponseTime = 
        (session.metadata.averageResponseTime * (session.metadata.requestCount - 1) + response.processingTime) / session.metadata.requestCount;

      await this.updateSession(sessionId, session);

      return response;
    } catch (error) {
      console.error('Error processing text request:', error);
      throw error;
    }
  }

  async analyzeText(sessionId: string, text: string): Promise<NLPAnalysis> {
    try {
      const session = await this.getSession(sessionId);
      if (!session) {
        throw new Error(`Session ${sessionId} not found`);
      }

      const analysis = await nlpEngine.analyzeText(text);

      // Update session
      session.metadata.requestCount++;
      session.metadata.lastActivity = new Date().toISOString();
      await this.updateSession(sessionId, session);

      return analysis;
    } catch (error) {
      console.error('Error analyzing text:', error);
      throw error;
    }
  }

  async generateResponse(sessionId: string, context: any, type: string): Promise<string> {
    try {
      const session = await this.getSession(sessionId);
      if (!session) {
        throw new Error(`Session ${sessionId} not found`);
      }

      const response = await nlpEngine.generateResponse(context, type);

      // Update session
      session.metadata.requestCount++;
      session.metadata.lastActivity = new Date().toISOString();
      await this.updateSession(sessionId, session);

      return response;
    } catch (error) {
      console.error('Error generating response:', error);
      throw error;
    }
  }

  async startConversation(sessionId: string, title: string, participants: string[]): Promise<Conversation> {
    try {
      const session = await this.getSession(sessionId);
      if (!session) {
        throw new Error(`Session ${sessionId} not found`);
      }

      const conversation = await conversationManager.createConversation(title, participants);

      // Update session metadata
      session.metadata.conversationId = conversation.id;
      await this.updateSession(sessionId, session);

      return conversation;
    } catch (error) {
      console.error('Error starting conversation:', error);
      throw error;
    }
  }

  async sendMessage(sessionId: string, conversationId: string, sender: string, content: string): Promise<ConversationMessage> {
    try {
      const session = await this.getSession(sessionId);
      if (!session) {
        throw new Error(`Session ${sessionId} not found`);
      }

      const message = await conversationManager.addMessage(conversationId, sender, content);

      // Update session
      session.metadata.requestCount++;
      session.metadata.lastActivity = new Date().toISOString();
      await this.updateSession(sessionId, session);

      return message;
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }

  async getConversationHistory(sessionId: string, conversationId: string, limit?: number): Promise<ConversationMessage[]> {
    try {
      const session = await this.getSession(sessionId);
      if (!session) {
        throw new Error(`Session ${sessionId} not found`);
      }

      return await conversationManager.getConversationHistory(conversationId, limit);
    } catch (error) {
      console.error('Error getting conversation history:', error);
      return [];
    }
  }

  async endConversation(sessionId: string, conversationId: string): Promise<void> {
    try {
      const session = await this.getSession(sessionId);
      if (!session) {
        throw new Error(`Session ${sessionId} not found`);
      }

      await conversationManager.endConversation(conversationId);

      // Update session
      session.metadata.lastActivity = new Date().toISOString();
      await this.updateSession(sessionId, session);
    } catch (error) {
      console.error('Error ending conversation:', error);
      throw error;
    }
  }

  async processDocument(sessionId: string, content: string, title: string, type: string, source: string): Promise<Document> {
    try {
      const session = await this.getSession(sessionId);
      if (!session) {
        throw new Error(`Session ${sessionId} not found`);
      }

      const document = await documentProcessor.processDocument(content, title, type, source);

      // Update session metadata
      if (!session.metadata.documentIds) {
        session.metadata.documentIds = [];
      }
      session.metadata.documentIds.push(document.id);
      session.metadata.requestCount++;
      session.metadata.lastActivity = new Date().toISOString();
      await this.updateSession(sessionId, session);

      return document;
    } catch (error) {
      console.error('Error processing document:', error);
      throw error;
    }
  }

  async analyzeDocument(sessionId: string, documentId: string): Promise<DocumentAnalysis> {
    try {
      const session = await this.getSession(sessionId);
      if (!session) {
        throw new Error(`Session ${sessionId} not found`);
      }

      const analysis = await documentProcessor.analyzeDocument(documentId);

      // Update session
      session.metadata.requestCount++;
      session.metadata.lastActivity = new Date().toISOString();
      await this.updateSession(sessionId, session);

      return analysis;
    } catch (error) {
      console.error('Error analyzing document:', error);
      throw error;
    }
  }

  async searchDocuments(sessionId: string, query: string, filters?: any): Promise<Document[]> {
    try {
      const session = await this.getSession(sessionId);
      if (!session) {
        throw new Error(`Session ${sessionId} not found`);
      }

      const documents = await documentProcessor.searchDocuments(query, filters);

      // Update session
      session.metadata.requestCount++;
      session.metadata.lastActivity = new Date().toISOString();
      await this.updateSession(sessionId, session);

      return documents;
    } catch (error) {
      console.error('Error searching documents:', error);
      return [];
    }
  }

  async generateReport(sessionId: string, type: string): Promise<NLPReport> {
    try {
      const session = await this.getSession(sessionId);
      if (!session) {
        throw new Error(`Session ${sessionId} not found`);
      }

      let content: any = {};

      switch (type) {
        case 'conversation_summary':
          if (session.metadata.conversationId) {
            const conversation = await conversationManager.getConversation(session.metadata.conversationId);
            const history = await conversationManager.getConversationHistory(session.metadata.conversationId);
            content = {
              conversation,
              messageCount: history.length,
              participants: conversation?.participants || [],
              duration: session.endTime ? 
                new Date(session.endTime).getTime() - new Date(session.startTime).getTime() : 
                Date.now() - new Date(session.startTime).getTime()
            };
          }
          break;
        case 'document_analysis':
          if (session.metadata.documentIds) {
            const documents = await Promise.all(
              session.metadata.documentIds.map(id => documentProcessor.getDocument(id))
            );
            content = {
              documents: documents.filter(d => d !== null),
              totalDocuments: documents.filter(d => d !== null).length,
              analyses: documents.filter(d => d !== null).map(d => d?.analysis).filter(a => a !== undefined)
            };
          }
          break;
        case 'processing_metrics':
          content = {
            session,
            metrics: await this.getSessionMetrics(sessionId)
          };
          break;
        case 'comprehensive':
          content = {
            session,
            conversations: session.metadata.conversationId ? 
              [await conversationManager.getConversation(session.metadata.conversationId)] : [],
            documents: session.metadata.documentIds ? 
              await Promise.all(session.metadata.documentIds.map(id => documentProcessor.getDocument(id))) : [],
            metrics: await this.getSessionMetrics(sessionId)
          };
          break;
      }

      const report: NLPReport = {
        id: uuidv4(),
        sessionId,
        type: type as 'conversation_summary' | 'document_analysis' | 'processing_metrics' | 'comprehensive',
        content,
        generatedAt: new Date().toISOString()
      };

      const reports = await this.getReports();
      reports.push(report);
      await fs.writeFile(this.reportsFile, JSON.stringify(reports, null, 2));

      return report;
    } catch (error) {
      console.error('Error generating report:', error);
      throw error;
    }
  }

  async getMetrics(): Promise<NLPMetrics> {
    try {
      const sessions = await this.getSessions();
      const activeSessions = sessions.filter(s => s.status === 'active').length;
      
      const totalRequests = sessions.reduce((sum, s) => sum + s.metadata.requestCount, 0);
      const totalResponseTime = sessions.reduce((sum, s) => sum + (s.metadata.averageResponseTime * s.metadata.requestCount), 0);
      const averageResponseTime = totalRequests > 0 ? totalResponseTime / totalRequests : 0;
      
      const successRate = sessions.length > 0 ? 
        sessions.filter(s => s.status === 'completed').length / sessions.length : 0;

      const conversations = await conversationManager.listConversations();
      const documents = await documentProcessor.listDocuments();
      const languageModels = await nlpEngine.getLanguageModels();

      const metrics: NLPMetrics = {
        totalRequests,
        averageResponseTime,
        successRate,
        activeSessions,
        totalConversations: conversations.length,
        totalDocuments: documents.length,
        languageModels: languageModels.length,
        lastUpdated: new Date().toISOString()
      };

      await fs.writeFile(this.metricsFile, JSON.stringify(metrics, null, 2));
      return metrics;
    } catch (error) {
      console.error('Error getting metrics:', error);
      return {
        totalRequests: 0,
        averageResponseTime: 0,
        successRate: 0,
        activeSessions: 0,
        totalConversations: 0,
        totalDocuments: 0,
        languageModels: 0,
        lastUpdated: new Date().toISOString()
      };
    }
  }

  async getSessionMetrics(sessionId: string): Promise<any> {
    try {
      const session = await this.getSession(sessionId);
      if (!session) {
        return null;
      }

      return {
        sessionId,
        duration: session.endTime ? 
          new Date(session.endTime).getTime() - new Date(session.startTime).getTime() : 
          Date.now() - new Date(session.startTime).getTime(),
        requestCount: session.metadata.requestCount,
        averageResponseTime: session.metadata.averageResponseTime,
        lastActivity: session.metadata.lastActivity,
        status: session.status
      };
    } catch (error) {
      console.error('Error getting session metrics:', error);
      return null;
    }
  }

  async getLanguageModels(): Promise<any[]> {
    try {
      return await nlpEngine.getLanguageModels();
    } catch (error) {
      console.error('Error getting language models:', error);
      return [];
    }
  }

  async updateLanguageModel(modelId: string, updates: any): Promise<void> {
    try {
      await nlpEngine.updateLanguageModel(modelId, updates);
    } catch (error) {
      console.error('Error updating language model:', error);
      throw error;
    }
  }

  private async getSessions(): Promise<NLPSession[]> {
    try {
      const data = await fs.readFile(this.sessionsFile, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      return [];
    }
  }

  private async getReports(): Promise<NLPReport[]> {
    try {
      const data = await fs.readFile(this.reportsFile, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      return [];
    }
  }
}

export const nlpController = new OMINLPController(); 