import { 
  LearningAnalyticsEngine, 
  LearningAnalytics, 
  LearningProgress, 
  TopConcept,
  TeachingSession,
  LearnedConcept,
  FeedbackEntry
} from './types';
import { sessionManager } from './session-manager';

export class OMILearningAnalyticsEngine implements LearningAnalyticsEngine {
  
  async calculateProgress(sessionId: string): Promise<number> {
    const session = await sessionManager.getSession(sessionId);
    if (!session) return 0;

    if (session.concepts.length === 0) return 0;
    
    const totalConcepts = session.concepts.length;
    const validatedConcepts = session.concepts.filter(c => c.validated).length;
    const averageConfidence = session.concepts.reduce((sum, c) => sum + c.confidence, 0) / totalConcepts;
    
    // Progress based on validation (60%) and confidence (40%)
    const validationProgress = (validatedConcepts / totalConcepts) * 60;
    const confidenceProgress = (averageConfidence / 100) * 40;
    
    return Math.round(validationProgress + confidenceProgress);
  }

  async generateAnalytics(): Promise<LearningAnalytics> {
    const sessions = await sessionManager.loadSessions();
    const concepts = await sessionManager.loadConcepts();
    const feedback = await sessionManager.loadFeedback();

    // Calculate basic metrics
    const totalSessions = sessions.length;
    const activeSessions = sessions.filter(s => s.status === 'active').length;
    const completedSessions = sessions.filter(s => s.status === 'completed').length;
    const totalConcepts = concepts.length;
    const validatedConcepts = concepts.filter(c => c.validated).length;
    const averageConfidence = concepts.length > 0 
      ? concepts.reduce((sum, c) => sum + c.confidence, 0) / concepts.length 
      : 0;

    // Generate learning progress data (last 30 days)
    const learningProgress = await this.generateLearningProgress(sessions);

    // Generate top concepts
    const topConcepts = await this.generateTopConcepts(concepts);

    // Get recent feedback
    const recentFeedback = feedback
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 10);

    return {
      totalSessions,
      activeSessions,
      completedSessions,
      totalConcepts,
      validatedConcepts,
      averageConfidence: Math.round(averageConfidence),
      learningProgress,
      topConcepts,
      recentFeedback
    };
  }

  async trackConceptUsage(conceptId: string): Promise<void> {
    // In a real implementation, this would track concept usage in a dedicated database
    // For now, we'll just log it
    console.log(`Concept ${conceptId} was used at ${new Date().toISOString()}`);
  }

  async identifyKnowledgeGaps(): Promise<string[]> {
    const sessions = await sessionManager.loadSessions();
    const concepts = await sessionManager.loadConcepts();
    const gaps: string[] = [];

    // Identify sessions with low progress
    const lowProgressSessions = sessions.filter(s => s.progress < 30);
    if (lowProgressSessions.length > 0) {
      gaps.push(`${lowProgressSessions.length} sessions have low progress (< 30%)`);
    }

    // Identify unvalidated concepts
    const unvalidatedConcepts = concepts.filter(c => !c.validated);
    if (unvalidatedConcepts.length > 0) {
      gaps.push(`${unvalidatedConcepts.length} concepts need validation`);
    }

    // Identify concepts with low confidence
    const lowConfidenceConcepts = concepts.filter(c => c.confidence < 50);
    if (lowConfidenceConcepts.length > 0) {
      gaps.push(`${lowConfidenceConcepts.length} concepts have low confidence (< 50%)`);
    }

    // Identify sessions without recent activity
    const inactiveSessions = sessions.filter(s => {
      const daysSinceUpdate = (Date.now() - new Date(s.updatedAt).getTime()) / (1000 * 60 * 60 * 24);
      return s.status === 'active' && daysSinceUpdate > 7;
    });
    if (inactiveSessions.length > 0) {
      gaps.push(`${inactiveSessions.length} active sessions haven't been updated in over a week`);
    }

    return gaps;
  }

  async measureTeachingEffectiveness(teacher: string): Promise<number> {
    const sessions = await sessionManager.loadSessions();
    const teacherSessions = sessions.filter(s => s.teacher === teacher);
    
    if (teacherSessions.length === 0) return 0;

    let totalEffectiveness = 0;

    for (const session of teacherSessions) {
      // Calculate effectiveness based on multiple factors
      let sessionEffectiveness = 0;

      // Progress factor (40% weight)
      sessionEffectiveness += (session.progress / 100) * 40;

      // Concept quality factor (30% weight)
      if (session.concepts.length > 0) {
        const avgConfidence = session.concepts.reduce((sum, c) => sum + c.confidence, 0) / session.concepts.length;
        sessionEffectiveness += (avgConfidence / 100) * 30;
      }

      // Feedback quality factor (20% weight)
      if (session.feedback.length > 0) {
        const positiveFeedback = session.feedback.filter(f => f.impact === 'positive').length;
        const feedbackQuality = positiveFeedback / session.feedback.length;
        sessionEffectiveness += feedbackQuality * 20;
      }

      // Completion factor (10% weight)
      if (session.status === 'completed') {
        sessionEffectiveness += 10;
      }

      totalEffectiveness += sessionEffectiveness;
    }

    return Math.round(totalEffectiveness / teacherSessions.length);
  }

  private async generateLearningProgress(sessions: TeachingSession[]): Promise<LearningProgress[]> {
    const progress: LearningProgress[] = [];
    const now = new Date();

    // Generate data for the last 30 days
    for (let i = 29; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      // Find sessions created on this date
      const sessionsOnDate = sessions.filter(s => 
        s.createdAt.startsWith(dateStr)
      );

      // Find concepts created on this date
      const conceptsOnDate = await this.getConceptsCreatedOnDate(dateStr);

      // Calculate metrics for this date
      const conceptsLearned = conceptsOnDate.length;
      const confidenceGained = conceptsOnDate.length > 0 
        ? conceptsOnDate.reduce((sum, c) => sum + c.confidence, 0) / conceptsOnDate.length 
        : 0;
      const sessionsCompleted = sessionsOnDate.filter(s => s.status === 'completed').length;

      progress.push({
        date: dateStr,
        conceptsLearned,
        confidenceGained: Math.round(confidenceGained),
        sessionsCompleted
      });
    }

    return progress;
  }

  private async generateTopConcepts(concepts: LearnedConcept[]): Promise<TopConcept[]> {
    // Sort concepts by confidence and usage (simulated)
    const topConcepts = concepts
      .sort((a, b) => {
        // Primary sort by confidence
        if (b.confidence !== a.confidence) {
          return b.confidence - a.confidence;
        }
        // Secondary sort by recency
        return new Date(b.lastTested).getTime() - new Date(a.lastTested).getTime();
      })
      .slice(0, 10)
      .map(concept => ({
        concept: concept.concept,
        confidence: concept.confidence,
        usageCount: concept.testResults.length, // Simulate usage count
        lastUsed: concept.lastTested
      }));

    return topConcepts;
  }

  private async getConceptsCreatedOnDate(dateStr: string): Promise<LearnedConcept[]> {
    const concepts = await sessionManager.loadConcepts();
    return concepts.filter(c => c.createdAt.startsWith(dateStr));
  }

  async generateTeacherReport(teacher: string): Promise<{
    totalSessions: number;
    completedSessions: number;
    averageProgress: number;
    totalConcepts: number;
    averageConfidence: number;
    effectiveness: number;
    recentActivity: TeachingSession[];
    topConcepts: TopConcept[];
  }> {
    const sessions = await sessionManager.loadSessions();
    const concepts = await sessionManager.loadConcepts();
    
    const teacherSessions = sessions.filter(s => s.teacher === teacher);
    const teacherConcepts = concepts.filter(c => 
      teacherSessions.some(s => s.concepts.some(sc => sc.id === c.id))
    );

    const totalSessions = teacherSessions.length;
    const completedSessions = teacherSessions.filter(s => s.status === 'completed').length;
    const averageProgress = teacherSessions.length > 0 
      ? teacherSessions.reduce((sum, s) => sum + s.progress, 0) / teacherSessions.length 
      : 0;
    const totalConcepts = teacherConcepts.length;
    const averageConfidence = teacherConcepts.length > 0 
      ? teacherConcepts.reduce((sum, c) => sum + c.confidence, 0) / teacherConcepts.length 
      : 0;
    const effectiveness = await this.measureTeachingEffectiveness(teacher);
    
    const recentActivity = teacherSessions
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 5);

    const topConcepts = await this.generateTopConcepts(teacherConcepts);

    return {
      totalSessions,
      completedSessions,
      averageProgress: Math.round(averageProgress),
      totalConcepts,
      averageConfidence: Math.round(averageConfidence),
      effectiveness,
      recentActivity,
      topConcepts
    };
  }

  async generateSessionInsights(sessionId: string): Promise<{
    progressTrend: 'improving' | 'declining' | 'stable';
    conceptQuality: 'high' | 'medium' | 'low';
    feedbackSentiment: 'positive' | 'negative' | 'neutral';
    recommendations: string[];
  }> {
    const session = await sessionManager.getSession(sessionId);
    if (!session) {
      return {
        progressTrend: 'stable',
        conceptQuality: 'low',
        feedbackSentiment: 'neutral',
        recommendations: ['Session not found']
      };
    }

    // Analyze progress trend
    let progressTrend: 'improving' | 'declining' | 'stable' = 'stable';
    if (session.concepts.length >= 2) {
      const recentConcepts = session.concepts.slice(-2);
      const avgRecentConfidence = recentConcepts.reduce((sum, c) => sum + c.confidence, 0) / recentConcepts.length;
      const avgOverallConfidence = session.concepts.reduce((sum, c) => sum + c.confidence, 0) / session.concepts.length;
      
      if (avgRecentConfidence > avgOverallConfidence + 10) {
        progressTrend = 'improving';
      } else if (avgRecentConfidence < avgOverallConfidence - 10) {
        progressTrend = 'declining';
      }
    }

    // Analyze concept quality
    let conceptQuality: 'high' | 'medium' | 'low' = 'medium';
    if (session.concepts.length > 0) {
      const avgConfidence = session.concepts.reduce((sum, c) => sum + c.confidence, 0) / session.concepts.length;
      if (avgConfidence >= 80) {
        conceptQuality = 'high';
      } else if (avgConfidence < 50) {
        conceptQuality = 'low';
      }
    }

    // Analyze feedback sentiment
    let feedbackSentiment: 'positive' | 'negative' | 'neutral' = 'neutral';
    if (session.feedback.length > 0) {
      const positiveCount = session.feedback.filter(f => f.impact === 'positive').length;
      const negativeCount = session.feedback.filter(f => f.impact === 'negative').length;
      
      if (positiveCount > negativeCount) {
        feedbackSentiment = 'positive';
      } else if (negativeCount > positiveCount) {
        feedbackSentiment = 'negative';
      }
    }

    // Generate recommendations
    const recommendations: string[] = [];
    
    if (progressTrend === 'declining') {
      recommendations.push('Focus on improving concept clarity and providing more examples');
    }
    
    if (conceptQuality === 'low') {
      recommendations.push('Enhance concept descriptions and add more detailed examples');
    }
    
    if (feedbackSentiment === 'negative') {
      recommendations.push('Address negative feedback to improve teaching effectiveness');
    }
    
    if (session.progress < 50) {
      recommendations.push('Consider adding more concepts or providing more detailed explanations');
    }

    return {
      progressTrend,
      conceptQuality,
      feedbackSentiment,
      recommendations
    };
  }
}

export const learningAnalytics = new OMILearningAnalyticsEngine(); 