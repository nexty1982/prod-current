export interface TeachingSession {
  id: string;
  title: string;
  objective: string;
  status: 'active' | 'completed' | 'paused';
  createdAt: string;
  updatedAt: string;
  teacher: string;
  progress: number; // 0-100
  concepts: LearnedConcept[];
  feedback: FeedbackEntry[];
}

export interface LearnedConcept {
  id: string;
  concept: string;
  description: string;
  examples: string[];
  confidence: number; // 0-100
  validated: boolean;
  createdAt: string;
  lastTested: string;
  testResults: TestResult[];
  category: string;
  tags: string[];
}

export interface FeedbackEntry {
  id: string;
  sessionId: string;
  conceptId?: string;
  type: 'correction' | 'improvement' | 'validation' | 'example';
  content: string;
  providedBy: string;
  timestamp: string;
  impact: 'positive' | 'negative' | 'neutral';
  processed: boolean;
}

export interface TestResult {
  id: string;
  conceptId: string;
  testType: 'knowledge' | 'application' | 'validation';
  score: number; // 0-100
  timestamp: string;
  questions: TestQuestion[];
  passed: boolean;
}

export interface TestQuestion {
  id: string;
  question: string;
  answer: string;
  userAnswer?: string;
  correct: boolean;
  explanation?: string;
}

export interface LearningAnalytics {
  totalSessions: number;
  activeSessions: number;
  completedSessions: number;
  totalConcepts: number;
  validatedConcepts: number;
  averageConfidence: number;
  learningProgress: LearningProgress[];
  topConcepts: TopConcept[];
  recentFeedback: FeedbackEntry[];
}

export interface LearningProgress {
  date: string;
  conceptsLearned: number;
  confidenceGained: number;
  sessionsCompleted: number;
}

export interface TopConcept {
  concept: string;
  confidence: number;
  usageCount: number;
  lastUsed: string;
}

export interface TeachingInterface {
  startSession(title: string, objective: string): Promise<TeachingSession>;
  endSession(sessionId: string): Promise<void>;
  addConcept(sessionId: string, concept: Omit<LearnedConcept, 'id' | 'createdAt' | 'lastTested' | 'testResults'>): Promise<LearnedConcept>;
  provideFeedback(sessionId: string, feedback: Omit<FeedbackEntry, 'id' | 'timestamp' | 'processed'>): Promise<FeedbackEntry>;
  testConcept(conceptId: string, testType: TestResult['testType']): Promise<TestResult>;
  getAnalytics(): Promise<LearningAnalytics>;
  validateConcept(conceptId: string): Promise<boolean>;
}

export interface SessionManager {
  createSession(title: string, objective: string, teacher: string): Promise<TeachingSession>;
  getSession(sessionId: string): Promise<TeachingSession | null>;
  updateSession(sessionId: string, updates: Partial<TeachingSession>): Promise<void>;
  listSessions(teacher?: string, status?: TeachingSession['status']): Promise<TeachingSession[]>;
  deleteSession(sessionId: string): Promise<void>;
}

export interface KnowledgeValidator {
  validateConcept(concept: LearnedConcept): Promise<{ valid: boolean; confidence: number; issues: string[] }>;
  testKnowledge(conceptId: string): Promise<TestResult>;
  generateTestQuestions(concept: LearnedConcept): Promise<TestQuestion[]>;
  assessConfidence(concept: LearnedConcept): Promise<number>;
}

export interface FeedbackProcessor {
  processFeedback(feedback: FeedbackEntry): Promise<void>;
  updateConceptFromFeedback(conceptId: string, feedback: FeedbackEntry): Promise<void>;
  generateLearningRecommendations(sessionId: string): Promise<string[]>;
  trackFeedbackImpact(feedback: FeedbackEntry): Promise<void>;
}

export interface LearningAnalyticsEngine {
  calculateProgress(sessionId: string): Promise<number>;
  generateAnalytics(): Promise<LearningAnalytics>;
  trackConceptUsage(conceptId: string): Promise<void>;
  identifyKnowledgeGaps(): Promise<string[]>;
  measureTeachingEffectiveness(teacher: string): Promise<number>;
} 