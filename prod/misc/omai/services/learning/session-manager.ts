import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { 
  SessionManager, 
  TeachingSession, 
  LearnedConcept, 
  FeedbackEntry 
} from './types';

export class OMISessionManager implements SessionManager {
  private sessionsFile: string;
  private conceptsFile: string;
  private feedbackFile: string;

  constructor() {
    const learningDir = path.join(__dirname, '../memory');
    this.sessionsFile = path.join(learningDir, 'teaching-sessions.json');
    this.conceptsFile = path.join(learningDir, 'learned-concepts.json');
    this.feedbackFile = path.join(learningDir, 'feedback-history.json');
  }

  async createSession(title: string, objective: string, teacher: string): Promise<TeachingSession> {
    const session: TeachingSession = {
      id: uuidv4(),
      title,
      objective,
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      teacher,
      progress: 0,
      concepts: [],
      feedback: []
    };

    const sessions = await this.loadSessions();
    sessions.push(session);
    await this.saveSessions(sessions);

    return session;
  }

  async getSession(sessionId: string): Promise<TeachingSession | null> {
    const sessions = await this.loadSessions();
    return sessions.find(s => s.id === sessionId) || null;
  }

  async updateSession(sessionId: string, updates: Partial<TeachingSession>): Promise<void> {
    const sessions = await this.loadSessions();
    const sessionIndex = sessions.findIndex(s => s.id === sessionId);
    
    if (sessionIndex === -1) {
      throw new Error(`Session ${sessionId} not found`);
    }

    sessions[sessionIndex] = {
      ...sessions[sessionIndex],
      ...updates,
      updatedAt: new Date().toISOString()
    };

    await this.saveSessions(sessions);
  }

  async listSessions(teacher?: string, status?: TeachingSession['status']): Promise<TeachingSession[]> {
    let sessions = await this.loadSessions();
    
    if (teacher) {
      sessions = sessions.filter(s => s.teacher === teacher);
    }
    
    if (status) {
      sessions = sessions.filter(s => s.status === status);
    }

    return sessions.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }

  async deleteSession(sessionId: string): Promise<void> {
    const sessions = await this.loadSessions();
    const filteredSessions = sessions.filter(s => s.id !== sessionId);
    await this.saveSessions(filteredSessions);
  }

  async addConceptToSession(sessionId: string, concept: LearnedConcept): Promise<void> {
    const sessions = await this.loadSessions();
    const sessionIndex = sessions.findIndex(s => s.id === sessionId);
    
    if (sessionIndex === -1) {
      throw new Error(`Session ${sessionId} not found`);
    }

    sessions[sessionIndex].concepts.push(concept);
    sessions[sessionIndex].progress = this.calculateProgress(sessions[sessionIndex]);
    sessions[sessionIndex].updatedAt = new Date().toISOString();

    await this.saveSessions(sessions);
  }

  async addFeedbackToSession(sessionId: string, feedback: FeedbackEntry): Promise<void> {
    const sessions = await this.loadSessions();
    const sessionIndex = sessions.findIndex(s => s.id === sessionId);
    
    if (sessionIndex === -1) {
      throw new Error(`Session ${sessionId} not found`);
    }

    sessions[sessionIndex].feedback.push(feedback);
    sessions[sessionIndex].updatedAt = new Date().toISOString();

    await this.saveSessions(sessions);
  }

  private calculateProgress(session: TeachingSession): number {
    if (session.concepts.length === 0) return 0;
    
    const totalConcepts = session.concepts.length;
    const validatedConcepts = session.concepts.filter(c => c.validated).length;
    const averageConfidence = session.concepts.reduce((sum, c) => sum + c.confidence, 0) / totalConcepts;
    
    // Progress based on validation (60%) and confidence (40%)
    const validationProgress = (validatedConcepts / totalConcepts) * 60;
    const confidenceProgress = (averageConfidence / 100) * 40;
    
    return Math.round(validationProgress + confidenceProgress);
  }

  private async loadSessions(): Promise<TeachingSession[]> {
    try {
      const data = await fs.readFile(this.sessionsFile, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      // File doesn't exist or is empty, return empty array
      return [];
    }
  }

  private async saveSessions(sessions: TeachingSession[]): Promise<void> {
    // Ensure directory exists
    const dir = path.dirname(this.sessionsFile);
    await fs.mkdir(dir, { recursive: true });
    
    await fs.writeFile(this.sessionsFile, JSON.stringify(sessions, null, 2));
  }

  async loadConcepts(): Promise<LearnedConcept[]> {
    try {
      const data = await fs.readFile(this.conceptsFile, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      return [];
    }
  }

  async saveConcepts(concepts: LearnedConcept[]): Promise<void> {
    const dir = path.dirname(this.conceptsFile);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(this.conceptsFile, JSON.stringify(concepts, null, 2));
  }

  async loadFeedback(): Promise<FeedbackEntry[]> {
    try {
      const data = await fs.readFile(this.feedbackFile, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      return [];
    }
  }

  async saveFeedback(feedback: FeedbackEntry[]): Promise<void> {
    const dir = path.dirname(this.feedbackFile);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(this.feedbackFile, JSON.stringify(feedback, null, 2));
  }
}

export const sessionManager = new OMISessionManager(); 