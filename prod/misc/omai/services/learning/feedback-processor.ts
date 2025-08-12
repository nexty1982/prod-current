import { v4 as uuidv4 } from 'uuid';
import { 
  FeedbackProcessor, 
  FeedbackEntry, 
  LearnedConcept 
} from './types';
import { sessionManager } from './session-manager';
import { knowledgeValidator } from './knowledge-validator';

export class OMIFeedbackProcessor implements FeedbackProcessor {
  
  async processFeedback(feedback: FeedbackEntry): Promise<void> {
    // Mark feedback as processed
    feedback.processed = true;

    // Update the session with the processed feedback
    await sessionManager.addFeedbackToSession(feedback.sessionId, feedback);

    // If feedback is related to a specific concept, update that concept
    if (feedback.conceptId) {
      await this.updateConceptFromFeedback(feedback.conceptId, feedback);
    }

    // Track the impact of this feedback
    await this.trackFeedbackImpact(feedback);

    // Generate learning recommendations based on feedback
    const recommendations = await this.generateLearningRecommendations(feedback.sessionId);
    
    // Log the processing for audit purposes
    console.log(`Processed feedback ${feedback.id} for session ${feedback.sessionId}`);
    console.log(`Generated ${recommendations.length} recommendations`);
  }

  async updateConceptFromFeedback(conceptId: string, feedback: FeedbackEntry): Promise<void> {
    // Load all concepts to find the target concept
    const concepts = await sessionManager.loadConcepts();
    const conceptIndex = concepts.findIndex(c => c.id === conceptId);
    
    if (conceptIndex === -1) {
      console.warn(`Concept ${conceptId} not found for feedback update`);
      return;
    }

    const concept = concepts[conceptIndex];
    let updated = false;

    switch (feedback.type) {
      case 'correction':
        // Handle corrections to concept information
        if (feedback.content.includes('description')) {
          // Extract corrected description from feedback
          const correctedDescription = this.extractCorrection(feedback.content, 'description');
          if (correctedDescription) {
            concept.description = correctedDescription;
            updated = true;
          }
        }
        
        if (feedback.content.includes('example')) {
          // Extract corrected examples from feedback
          const correctedExamples = this.extractCorrection(feedback.content, 'example');
          if (correctedExamples) {
            concept.examples = [correctedExamples, ...concept.examples.slice(0, 2)]; // Keep top 3 examples
            updated = true;
          }
        }
        break;

      case 'improvement':
        // Handle improvements to concept
        if (feedback.content.includes('add') || feedback.content.includes('include')) {
          // Extract additional information from feedback
          const additionalInfo = this.extractImprovement(feedback.content);
          if (additionalInfo) {
            concept.description += ` ${additionalInfo}`;
            updated = true;
          }
        }
        break;

      case 'validation':
        // Handle validation feedback
        if (feedback.impact === 'positive') {
          concept.validated = true;
          concept.confidence = Math.min(100, concept.confidence + 10);
          updated = true;
        } else if (feedback.impact === 'negative') {
          concept.confidence = Math.max(0, concept.confidence - 10);
          updated = true;
        }
        break;

      case 'example':
        // Handle new examples
        const newExample = this.extractExample(feedback.content);
        if (newExample) {
          concept.examples.push(newExample);
          // Keep only the most recent examples
          concept.examples = concept.examples.slice(-3);
          updated = true;
        }
        break;
    }

    if (updated) {
      // Reassess confidence after updates
      concept.confidence = await knowledgeValidator.assessConfidence(concept);
      concept.lastTested = new Date().toISOString();
      
      // Save updated concepts
      concepts[conceptIndex] = concept;
      await sessionManager.saveConcepts(concepts);
      
      console.log(`Updated concept ${conceptId} based on feedback ${feedback.id}`);
    }
  }

  async generateLearningRecommendations(sessionId: string): Promise<string[]> {
    const session = await sessionManager.getSession(sessionId);
    if (!session) {
      return ['Session not found'];
    }

    const recommendations: string[] = [];

    // Analyze session progress
    if (session.progress < 30) {
      recommendations.push('Session progress is low. Consider adding more concepts or providing more detailed explanations.');
    }

    // Analyze concept validation
    const unvalidatedConcepts = session.concepts.filter(c => !c.validated);
    if (unvalidatedConcepts.length > 0) {
      recommendations.push(`Validate ${unvalidatedConcepts.length} concepts through testing to improve confidence.`);
    }

    // Analyze feedback patterns
    const negativeFeedback = session.feedback.filter(f => f.impact === 'negative');
    if (negativeFeedback.length > 0) {
      recommendations.push('Address negative feedback to improve concept accuracy and clarity.');
    }

    // Analyze concept completeness
    const incompleteConcepts = session.concepts.filter(c => 
      !c.description || c.description.length < 20 || c.examples.length < 1
    );
    if (incompleteConcepts.length > 0) {
      recommendations.push(`Enhance ${incompleteConcepts.length} concepts with more detailed descriptions and examples.`);
    }

    // Suggest next steps based on session objective
    if (session.objective.toLowerCase().includes('basic')) {
      recommendations.push('Consider moving to intermediate concepts once basics are mastered.');
    } else if (session.objective.toLowerCase().includes('advanced')) {
      recommendations.push('Focus on practical applications and real-world scenarios.');
    }

    return recommendations;
  }

  async trackFeedbackImpact(feedback: FeedbackEntry): Promise<void> {
    // Track feedback impact for analytics
    const impactData = {
      feedbackId: feedback.id,
      sessionId: feedback.sessionId,
      conceptId: feedback.conceptId,
      type: feedback.type,
      impact: feedback.impact,
      timestamp: feedback.timestamp,
      teacher: feedback.providedBy
    };

    // In a real implementation, this would be stored in a dedicated analytics database
    console.log('Feedback impact tracked:', impactData);
  }

  private extractCorrection(content: string, field: string): string | null {
    // Simple extraction logic - in a real implementation, this could use NLP
    const patterns = [
      new RegExp(`${field}[\\s]*should[\\s]*be[\\s]*["']?([^"']+)["']?`, 'i'),
      new RegExp(`correct[\\s]*${field}[\\s]*to[\\s]*["']?([^"']+)["']?`, 'i'),
      new RegExp(`${field}[\\s]*is[\\s]*wrong[\\s]*,[\\s]*it[\\s]*should[\\s]*be[\\s]*["']?([^"']+)["']?`, 'i')
    ];

    for (const pattern of patterns) {
      const match = content.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }

    return null;
  }

  private extractImprovement(content: string): string | null {
    // Extract additional information to add
    const patterns = [
      /add\s+["']?([^"']+)["']?/i,
      /include\s+["']?([^"']+)["']?/i,
      /should\s+also\s+mention\s+["']?([^"']+)["']?/i
    ];

    for (const pattern of patterns) {
      const match = content.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }

    return null;
  }

  private extractExample(content: string): string | null {
    // Extract example from feedback
    const patterns = [
      /example[:\s]+["']?([^"']+)["']?/i,
      /for\s+instance[:\s]+["']?([^"']+)["']?/i,
      /such\s+as[:\s]+["']?([^"']+)["']?/i
    ];

    for (const pattern of patterns) {
      const match = content.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }

    return null;
  }

  async analyzeFeedbackTrends(sessionId: string): Promise<{
    totalFeedback: number;
    feedbackByType: Record<string, number>;
    feedbackByImpact: Record<string, number>;
    commonIssues: string[];
    improvementSuggestions: string[];
  }> {
    const session = await sessionManager.getSession(sessionId);
    if (!session) {
      return {
        totalFeedback: 0,
        feedbackByType: {},
        feedbackByImpact: {},
        commonIssues: [],
        improvementSuggestions: []
      };
    }

    const feedbackByType: Record<string, number> = {};
    const feedbackByImpact: Record<string, number> = {};
    const issues: string[] = [];

    for (const feedback of session.feedback) {
      // Count by type
      feedbackByType[feedback.type] = (feedbackByType[feedback.type] || 0) + 1;
      
      // Count by impact
      feedbackByImpact[feedback.impact] = (feedbackByImpact[feedback.impact] || 0) + 1;

      // Extract common issues from negative feedback
      if (feedback.impact === 'negative') {
        const issue = this.extractIssue(feedback.content);
        if (issue) {
          issues.push(issue);
        }
      }
    }

    // Generate improvement suggestions
    const improvementSuggestions = this.generateImprovementSuggestions(feedbackByType, feedbackByImpact, issues);

    return {
      totalFeedback: session.feedback.length,
      feedbackByType,
      feedbackByImpact,
      commonIssues: this.getMostCommon(issues, 5),
      improvementSuggestions
    };
  }

  private extractIssue(content: string): string | null {
    // Extract common issues from feedback content
    const issuePatterns = [
      /unclear|confusing/i,
      /incomplete|missing/i,
      /incorrect|wrong/i,
      /too\s+complex|complicated/i,
      /too\s+simple|basic/i
    ];

    for (const pattern of issuePatterns) {
      if (pattern.test(content)) {
        return pattern.source.replace(/[\/\\]/g, '').replace(/i$/, '');
      }
    }

    return null;
  }

  private getMostCommon(items: string[], limit: number): string[] {
    const counts: Record<string, number> = {};
    for (const item of items) {
      counts[item] = (counts[item] || 0) + 1;
    }

    return Object.entries(counts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, limit)
      .map(([item]) => item);
  }

  private generateImprovementSuggestions(
    feedbackByType: Record<string, number>,
    feedbackByImpact: Record<string, number>,
    issues: string[]
  ): string[] {
    const suggestions: string[] = [];

    // Analyze feedback types
    if (feedbackByType.correction > 0) {
      suggestions.push('Focus on accuracy and fact-checking before presenting concepts.');
    }

    if (feedbackByType.improvement > 0) {
      suggestions.push('Provide more comprehensive explanations and examples.');
    }

    // Analyze feedback impact
    if (feedbackByImpact.negative > feedbackByImpact.positive) {
      suggestions.push('Review and revise concepts based on negative feedback.');
    }

    // Analyze common issues
    if (issues.includes('unclear')) {
      suggestions.push('Use clearer language and provide more concrete examples.');
    }

    if (issues.includes('incomplete')) {
      suggestions.push('Ensure all concepts are fully explained with sufficient detail.');
    }

    return suggestions;
  }
}

export const feedbackProcessor = new OMIFeedbackProcessor(); 