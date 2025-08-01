import { v4 as uuidv4 } from 'uuid';
import { 
  KnowledgeValidator, 
  LearnedConcept, 
  TestResult, 
  TestQuestion 
} from './types';

export class OMIKnowledgeValidator implements KnowledgeValidator {
  
  async validateConcept(concept: LearnedConcept): Promise<{ valid: boolean; confidence: number; issues: string[] }> {
    const issues: string[] = [];
    let confidence = concept.confidence;

    // Check concept completeness
    if (!concept.concept || concept.concept.trim().length < 3) {
      issues.push('Concept name is too short or missing');
      confidence -= 20;
    }

    if (!concept.description || concept.description.trim().length < 10) {
      issues.push('Concept description is too short or missing');
      confidence -= 15;
    }

    if (concept.examples.length === 0) {
      issues.push('No examples provided for concept');
      confidence -= 10;
    }

    // Check for conflicting information
    if (concept.examples.length > 0) {
      const exampleQuality = this.assessExampleQuality(concept.examples);
      if (exampleQuality < 0.7) {
        issues.push('Examples may be inconsistent or unclear');
        confidence -= 10;
      }
    }

    // Validate tags and category
    if (!concept.category || concept.category.trim().length === 0) {
      issues.push('Concept category is missing');
      confidence -= 5;
    }

    if (concept.tags.length === 0) {
      issues.push('No tags provided for concept');
      confidence -= 5;
    }

    // Ensure confidence is within bounds
    confidence = Math.max(0, Math.min(100, confidence));

    return {
      valid: issues.length === 0,
      confidence,
      issues
    };
  }

  async testKnowledge(conceptId: string): Promise<TestResult> {
    // This would typically load the concept from storage
    // For now, we'll create a mock test
    const questions = await this.generateTestQuestions({
      id: conceptId,
      concept: 'Test Concept',
      description: 'Test description',
      examples: ['Example 1', 'Example 2'],
      confidence: 80,
      validated: false,
      createdAt: new Date().toISOString(),
      lastTested: new Date().toISOString(),
      testResults: [],
      category: 'test',
      tags: ['test']
    });

    const score = this.calculateTestScore(questions);
    const passed = score >= 70;

    const testResult: TestResult = {
      id: uuidv4(),
      conceptId,
      testType: 'knowledge',
      score,
      timestamp: new Date().toISOString(),
      questions,
      passed
    };

    return testResult;
  }

  async generateTestQuestions(concept: LearnedConcept): Promise<TestQuestion[]> {
    const questions: TestQuestion[] = [];

    // Generate questions based on concept content
    if (concept.description) {
      questions.push({
        id: uuidv4(),
        question: `What is the main purpose of "${concept.concept}"?`,
        answer: concept.description,
        correct: false,
        explanation: 'This tests understanding of the concept definition'
      });
    }

    if (concept.examples.length > 0) {
      questions.push({
        id: uuidv4(),
        question: `Provide an example of "${concept.concept}"`,
        answer: concept.examples[0],
        correct: false,
        explanation: 'This tests ability to apply the concept'
      });
    }

    if (concept.category) {
      questions.push({
        id: uuidv4(),
        question: `What category does "${concept.concept}" belong to?`,
        answer: concept.category,
        correct: false,
        explanation: 'This tests categorization understanding'
      });
    }

    // Add application questions
    questions.push({
      id: uuidv4(),
      question: `How would you apply "${concept.concept}" in a real-world scenario?`,
      answer: 'Open-ended application question',
      correct: false,
      explanation: 'This tests practical application of the concept'
    });

    return questions;
  }

  async assessConfidence(concept: LearnedConcept): Promise<number> {
    let confidence = 50; // Base confidence

    // Factor in validation status
    if (concept.validated) {
      confidence += 20;
    }

    // Factor in test results
    if (concept.testResults.length > 0) {
      const averageTestScore = concept.testResults.reduce((sum, test) => sum + test.score, 0) / concept.testResults.length;
      confidence += (averageTestScore - 50) * 0.3; // Scale test scores to confidence
    }

    // Factor in concept completeness
    if (concept.description && concept.description.length > 50) {
      confidence += 10;
    }

    if (concept.examples.length >= 2) {
      confidence += 10;
    }

    if (concept.tags.length >= 3) {
      confidence += 5;
    }

    // Factor in recency of testing
    if (concept.lastTested) {
      const daysSinceTest = (Date.now() - new Date(concept.lastTested).getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceTest < 7) {
        confidence += 5; // Recent testing boosts confidence
      } else if (daysSinceTest > 30) {
        confidence -= 10; // Old testing reduces confidence
      }
    }

    // Ensure confidence is within bounds
    return Math.max(0, Math.min(100, Math.round(confidence)));
  }

  private assessExampleQuality(examples: string[]): number {
    if (examples.length === 0) return 0;

    let totalQuality = 0;
    
    for (const example of examples) {
      let quality = 0.5; // Base quality

      // Length factor
      if (example.length > 20) quality += 0.2;
      if (example.length > 50) quality += 0.1;

      // Clarity factor (simple heuristic)
      if (example.includes('because') || example.includes('when') || example.includes('if')) {
        quality += 0.1; // More explanatory
      }

      // Specificity factor
      if (example.includes('specific') || example.includes('example') || example.includes('instance')) {
        quality += 0.1;
      }

      totalQuality += quality;
    }

    return totalQuality / examples.length;
  }

  private calculateTestScore(questions: TestQuestion[]): number {
    if (questions.length === 0) return 0;

    const correctAnswers = questions.filter(q => q.correct).length;
    return Math.round((correctAnswers / questions.length) * 100);
  }

  async validateTestAnswer(questionId: string, userAnswer: string, correctAnswer: string): Promise<boolean> {
    // Simple exact match for now
    // In a real implementation, this could use semantic similarity or AI-based evaluation
    return userAnswer.toLowerCase().trim() === correctAnswer.toLowerCase().trim();
  }

  async generateConfidenceReport(concept: LearnedConcept): Promise<{
    overallConfidence: number;
    factors: { factor: string; impact: number; details: string }[];
    recommendations: string[];
  }> {
    const confidence = await this.assessConfidence(concept);
    const factors: { factor: string; impact: number; details: string }[] = [];
    const recommendations: string[] = [];

    // Analyze validation status
    if (concept.validated) {
      factors.push({ factor: 'Validation Status', impact: 20, details: 'Concept has been validated' });
    } else {
      factors.push({ factor: 'Validation Status', impact: -20, details: 'Concept has not been validated' });
      recommendations.push('Validate this concept through testing');
    }

    // Analyze test results
    if (concept.testResults.length > 0) {
      const avgScore = concept.testResults.reduce((sum, test) => sum + test.score, 0) / concept.testResults.length;
      factors.push({ 
        factor: 'Test Performance', 
        impact: Math.round((avgScore - 50) * 0.3), 
        details: `Average test score: ${Math.round(avgScore)}%` 
      });
      
      if (avgScore < 70) {
        recommendations.push('Improve test performance through additional practice');
      }
    } else {
      factors.push({ factor: 'Test Performance', impact: -15, details: 'No test results available' });
      recommendations.push('Take tests to assess knowledge');
    }

    // Analyze completeness
    if (concept.description && concept.description.length > 50) {
      factors.push({ factor: 'Description Completeness', impact: 10, details: 'Detailed description provided' });
    } else {
      factors.push({ factor: 'Description Completeness', impact: -10, details: 'Description could be more detailed' });
      recommendations.push('Enhance concept description');
    }

    if (concept.examples.length >= 2) {
      factors.push({ factor: 'Example Quality', impact: 10, details: `${concept.examples.length} examples provided` });
    } else {
      factors.push({ factor: 'Example Quality', impact: -10, details: 'More examples needed' });
      recommendations.push('Add more examples to illustrate the concept');
    }

    return {
      overallConfidence: confidence,
      factors,
      recommendations
    };
  }
}

export const knowledgeValidator = new OMIKnowledgeValidator(); 