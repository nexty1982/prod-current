import { v4 as uuidv4 } from 'uuid';
import { 
  TeachingInterface, 
  TeachingSession, 
  LearnedConcept, 
  FeedbackEntry, 
  TestResult,
  LearningAnalytics
} from './types';
import { sessionManager } from './session-manager';
import { knowledgeValidator } from './knowledge-validator';
import { feedbackProcessor } from './feedback-processor';
import { learningAnalytics } from './learning-analytics';

export class OMITeachingInterface implements TeachingInterface {
  
  async startSession(title: string, objective: string): Promise<TeachingSession> {
    // For now, we'll use a default teacher. In a real implementation, this would come from authentication
    const teacher = 'system'; // This would be the current user
    
    const session = await sessionManager.createSession(title, objective, teacher);
    
    console.log(`Started teaching session: ${title} (${session.id})`);
    return session;
  }

  async endSession(sessionId: string): Promise<void> {
    await sessionManager.updateSession(sessionId, { status: 'completed' });
    
    // Generate final analytics for the session
    const finalProgress = await learningAnalytics.calculateProgress(sessionId);
    await sessionManager.updateSession(sessionId, { progress: finalProgress });
    
    console.log(`Ended teaching session: ${sessionId} with final progress: ${finalProgress}%`);
  }

  async addConcept(
    sessionId: string, 
    concept: Omit<LearnedConcept, 'id' | 'createdAt' | 'lastTested' | 'testResults'>
  ): Promise<LearnedConcept> {
    const newConcept: LearnedConcept = {
      ...concept,
      id: uuidv4(),
      createdAt: new Date().toISOString(),
      lastTested: new Date().toISOString(),
      testResults: []
    };

    // Validate the concept
    const validation = await knowledgeValidator.validateConcept(newConcept);
    newConcept.confidence = validation.confidence;
    newConcept.validated = validation.valid;

    // Add to session
    await sessionManager.addConceptToSession(sessionId, newConcept);

    // Update session progress
    const progress = await learningAnalytics.calculateProgress(sessionId);
    await sessionManager.updateSession(sessionId, { progress });

    console.log(`Added concept "${newConcept.concept}" to session ${sessionId}`);
    return newConcept;
  }

  async provideFeedback(
    sessionId: string, 
    feedback: Omit<FeedbackEntry, 'id' | 'timestamp' | 'processed'>
  ): Promise<FeedbackEntry> {
    const newFeedback: FeedbackEntry = {
      ...feedback,
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      processed: false
    };

    // Process the feedback
    await feedbackProcessor.processFeedback(newFeedback);

    console.log(`Provided feedback to session ${sessionId}: ${feedback.type}`);
    return newFeedback;
  }

  async testConcept(conceptId: string, testType: TestResult['testType']): Promise<TestResult> {
    const testResult = await knowledgeValidator.testKnowledge(conceptId);
    
    // Update the concept with the test result
    const concepts = await sessionManager.loadConcepts();
    const conceptIndex = concepts.findIndex(c => c.id === conceptId);
    
    if (conceptIndex !== -1) {
      concepts[conceptIndex].testResults.push(testResult);
      concepts[conceptIndex].lastTested = new Date().toISOString();
      
      // Reassess confidence
      concepts[conceptIndex].confidence = await knowledgeValidator.assessConfidence(concepts[conceptIndex]);
      
      await sessionManager.saveConcepts(concepts);
    }

    console.log(`Tested concept ${conceptId}: ${testResult.score}% (${testResult.passed ? 'PASSED' : 'FAILED'})`);
    return testResult;
  }

  async getAnalytics(): Promise<LearningAnalytics> {
    return await learningAnalytics.generateAnalytics();
  }

  async validateConcept(conceptId: string): Promise<boolean> {
    const concepts = await sessionManager.loadConcepts();
    const concept = concepts.find(c => c.id === conceptId);
    
    if (!concept) {
      return false;
    }

    // Run validation
    const validation = await knowledgeValidator.validateConcept(concept);
    
    // Update concept validation status
    concept.validated = validation.valid;
    concept.confidence = validation.confidence;
    
    // Save updated concept
    const conceptIndex = concepts.findIndex(c => c.id === conceptId);
    if (conceptIndex !== -1) {
      concepts[conceptIndex] = concept;
      await sessionManager.saveConcepts(concepts);
    }

    console.log(`Validated concept ${conceptId}: ${validation.valid ? 'VALID' : 'INVALID'}`);
    return validation.valid;
  }

  // Additional helper methods for the teaching interface

  async getSession(sessionId: string): Promise<TeachingSession | null> {
    return await sessionManager.getSession(sessionId);
  }

  async listSessions(teacher?: string, status?: TeachingSession['status']): Promise<TeachingSession[]> {
    return await sessionManager.listSessions(teacher, status);
  }

  async pauseSession(sessionId: string): Promise<void> {
    await sessionManager.updateSession(sessionId, { status: 'paused' });
    console.log(`Paused session: ${sessionId}`);
  }

  async resumeSession(sessionId: string): Promise<void> {
    await sessionManager.updateSession(sessionId, { status: 'active' });
    console.log(`Resumed session: ${sessionId}`);
  }

  async getSessionInsights(sessionId: string): Promise<{
    progressTrend: 'improving' | 'declining' | 'stable';
    conceptQuality: 'high' | 'medium' | 'low';
    feedbackSentiment: 'positive' | 'negative' | 'neutral';
    recommendations: string[];
  }> {
    return await learningAnalytics.generateSessionInsights(sessionId);
  }

  async getTeacherReport(teacher: string): Promise<{
    totalSessions: number;
    completedSessions: number;
    averageProgress: number;
    totalConcepts: number;
    averageConfidence: number;
    effectiveness: number;
    recentActivity: TeachingSession[];
    topConcepts: any[];
  }> {
    return await learningAnalytics.generateTeacherReport(teacher);
  }

  async getFeedbackTrends(sessionId: string): Promise<{
    totalFeedback: number;
    feedbackByType: Record<string, number>;
    feedbackByImpact: Record<string, number>;
    commonIssues: string[];
    improvementSuggestions: string[];
  }> {
    return await feedbackProcessor.analyzeFeedbackTrends(sessionId);
  }

  async getConfidenceReport(conceptId: string): Promise<{
    overallConfidence: number;
    factors: { factor: string; impact: number; details: string }[];
    recommendations: string[];
  }> {
    const concepts = await sessionManager.loadConcepts();
    const concept = concepts.find(c => c.id === conceptId);
    
    if (!concept) {
      throw new Error(`Concept ${conceptId} not found`);
    }

    return await knowledgeValidator.generateConfidenceReport(concept);
  }

  async searchConcepts(query: string): Promise<LearnedConcept[]> {
    const concepts = await sessionManager.loadConcepts();
    
    return concepts.filter(concept => 
      concept.concept.toLowerCase().includes(query.toLowerCase()) ||
      concept.description.toLowerCase().includes(query.toLowerCase()) ||
      concept.tags.some(tag => tag.toLowerCase().includes(query.toLowerCase())) ||
      concept.category.toLowerCase().includes(query.toLowerCase())
    );
  }

  async getConceptsByCategory(category: string): Promise<LearnedConcept[]> {
    const concepts = await sessionManager.loadConcepts();
    return concepts.filter(c => c.category.toLowerCase() === category.toLowerCase());
  }

  async getConceptsByTag(tag: string): Promise<LearnedConcept[]> {
    const concepts = await sessionManager.loadConcepts();
    return concepts.filter(c => c.tags.some(t => t.toLowerCase() === tag.toLowerCase()));
  }

  async exportSessionData(sessionId: string): Promise<{
    session: TeachingSession;
    concepts: LearnedConcept[];
    feedback: FeedbackEntry[];
    analytics: any;
  }> {
    const session = await sessionManager.getSession(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    const concepts = await sessionManager.loadConcepts();
    const sessionConcepts = concepts.filter(c => 
      session.concepts.some(sc => sc.id === c.id)
    );

    const feedback = await sessionManager.loadFeedback();
    const sessionFeedback = feedback.filter(f => f.sessionId === sessionId);

    const analytics = await this.getSessionInsights(sessionId);

    return {
      session,
      concepts: sessionConcepts,
      feedback: sessionFeedback,
      analytics
    };
  }

  async importSessionData(data: {
    title: string;
    objective: string;
    concepts: Omit<LearnedConcept, 'id' | 'createdAt' | 'lastTested' | 'testResults'>[];
  }): Promise<TeachingSession> {
    const session = await this.startSession(data.title, data.objective);
    
    for (const concept of data.concepts) {
      await this.addConcept(session.id, concept);
    }

    console.log(`Imported session with ${data.concepts.length} concepts`);
    return session;
  }
}

export const teachingInterface = new OMITeachingInterface(); 