import { v4 as uuidv4 } from 'uuid';
import fs from 'fs/promises';
import path from 'path';

// Import all autonomy components
import { decisionEngine, AutonomousDecision, DecisionContext } from '../autonomy/decision-engine';
import { selfAnalyzer, SelfAnalysis } from '../autonomy/self-analyzer';
import { goalManager, AutonomousGoal, GoalContext } from '../autonomy/goal-manager';
import { improvementEngine, ImprovementCycle } from '../self-improvement/improvement-cycle';
import { metaCognitionEngine, MetaCognitiveState } from '../autonomy/meta-cognition';

export interface AutonomySession {
  id: string;
  status: 'active' | 'paused' | 'completed' | 'failed';
  startTime: string;
  endTime?: string;
  decisions: AutonomousDecision[];
  goals: AutonomousGoal[];
  improvements: ImprovementCycle[];
  metaAnalysis: MetaCognitiveState[];
  performance: AutonomyPerformance;
}

export interface AutonomyPerformance {
  decisionsExecuted: number;
  decisionsSuccessful: number;
  goalsCompleted: number;
  goalsActive: number;
  improvementsInitiated: number;
  improvementsCompleted: number;
  overallEfficiency: number;
  learningRate: number;
  adaptationSpeed: number;
}

export interface AutonomyController {
  startAutonomySession(): Promise<AutonomySession>;
  pauseAutonomySession(sessionId: string): Promise<void>;
  resumeAutonomySession(sessionId: string): Promise<void>;
  endAutonomySession(sessionId: string): Promise<void>;
  executeAutonomyCycle(sessionId: string): Promise<boolean>;
  getAutonomySession(sessionId: string): Promise<AutonomySession | null>;
  listAutonomySessions(): Promise<AutonomySession[]>;
  getAutonomyPerformance(sessionId: string): Promise<AutonomyPerformance>;
  generateAutonomyReport(sessionId: string): Promise<AutonomyReport>;
  setAutonomyParameters(parameters: AutonomyParameters): Promise<void>;
  getAutonomyStatus(): Promise<AutonomyStatus>;
}

export interface AutonomyReport {
  sessionId: string;
  timestamp: string;
  summary: string;
  decisions: DecisionSummary[];
  goals: GoalSummary[];
  improvements: ImprovementSummary[];
  metaAnalysis: MetaAnalysisSummary;
  recommendations: string[];
  nextSteps: string[];
}

export interface DecisionSummary {
  total: number;
  successful: number;
  failed: number;
  byType: Record<string, number>;
  byPriority: Record<string, number>;
  averageImpact: number;
}

export interface GoalSummary {
  total: number;
  completed: number;
  active: number;
  byCategory: Record<string, number>;
  averageProgress: number;
  successRate: number;
}

export interface ImprovementSummary {
  total: number;
  completed: number;
  failed: number;
  byType: Record<string, number>;
  averageImpact: number;
  successRate: number;
}

export interface MetaAnalysisSummary {
  selfAwarenessLevel: string;
  confidenceLevel: number;
  limitationsCount: number;
  uncertaintiesCount: number;
  learningEffectiveness: number;
}

export interface AutonomyParameters {
  decisionThreshold: number;
  goalPriority: 'conservative' | 'balanced' | 'aggressive';
  improvementFrequency: number;
  metaAnalysisInterval: number;
  safetyConstraints: string[];
  learningRate: number;
}

export interface AutonomyStatus {
  isActive: boolean;
  currentSession?: string;
  lastActivity: string;
  performance: AutonomyPerformance;
  health: 'excellent' | 'good' | 'fair' | 'poor';
  recommendations: string[];
}

export class OMIAutonomyController implements AutonomyController {
  private sessionsFile: string;
  private parametersFile: string;
  private statusFile: string;
  private currentSession: AutonomySession | null = null;

  constructor() {
    const integrationDir = path.join(__dirname, '../memory');
    this.sessionsFile = path.join(integrationDir, 'autonomy-sessions.json');
    this.parametersFile = path.join(integrationDir, 'autonomy-parameters.json');
    this.statusFile = path.join(integrationDir, 'autonomy-status.json');
  }

  async startAutonomySession(): Promise<AutonomySession> {
    // End any existing session
    if (this.currentSession) {
      await this.endAutonomySession(this.currentSession.id);
    }

    const session: AutonomySession = {
      id: uuidv4(),
      status: 'active',
      startTime: new Date().toISOString(),
      decisions: [],
      goals: [],
      improvements: [],
      metaAnalysis: [],
      performance: {
        decisionsExecuted: 0,
        decisionsSuccessful: 0,
        goalsCompleted: 0,
        goalsActive: 0,
        improvementsInitiated: 0,
        improvementsCompleted: 0,
        overallEfficiency: 0,
        learningRate: 0,
        adaptationSpeed: 0
      }
    };

    this.currentSession = session;
    await this.saveSession(session);
    await this.updateStatus();

    // Initialize first autonomy cycle
    await this.executeAutonomyCycle(session.id);

    return session;
  }

  async pauseAutonomySession(sessionId: string): Promise<void> {
    const session = await this.getAutonomySession(sessionId);
    if (!session) {
      throw new Error(`Autonomy session with ID ${sessionId} not found`);
    }

    session.status = 'paused';
    await this.saveSession(session);
    await this.updateStatus();
  }

  async resumeAutonomySession(sessionId: string): Promise<void> {
    const session = await this.getAutonomySession(sessionId);
    if (!session) {
      throw new Error(`Autonomy session with ID ${sessionId} not found`);
    }

    session.status = 'active';
    await this.saveSession(session);
    await this.updateStatus();

    // Resume autonomy cycle
    await this.executeAutonomyCycle(sessionId);
  }

  async endAutonomySession(sessionId: string): Promise<void> {
    const session = await this.getAutonomySession(sessionId);
    if (!session) {
      throw new Error(`Autonomy session with ID ${sessionId} not found`);
    }

    session.status = 'completed';
    session.endTime = new Date().toISOString();
    await this.saveSession(session);
    await this.updateStatus();

    if (this.currentSession?.id === sessionId) {
      this.currentSession = null;
    }
  }

  async executeAutonomyCycle(sessionId: string): Promise<boolean> {
    const session = await this.getAutonomySession(sessionId);
    if (!session) {
      throw new Error(`Autonomy session with ID ${sessionId} not found`);
    }

    if (session.status !== 'active') {
      return false;
    }

    try {
      // Step 1: Perform self-analysis
      const selfAnalysis = await selfAnalyzer.performAnalysis();
      session.metaAnalysis.push(selfAnalysis);

      // Step 2: Generate autonomous decisions
      const decisionContext = await decisionEngine.analyzeContext();
      const decisions = await decisionEngine.generateDecisions(decisionContext);
      const prioritizedDecisions = await decisionEngine.prioritizeDecisions(decisions);

      // Step 3: Execute high-priority decisions
      for (const decision of prioritizedDecisions.slice(0, 3)) { // Limit to top 3 decisions
        const success = await decisionEngine.executeDecision(decision);
        session.decisions.push(decision);
        session.performance.decisionsExecuted++;
        if (success) {
          session.performance.decisionsSuccessful++;
        }
      }

      // Step 4: Generate and manage goals
      const goalContext: GoalContext = {
        currentCapabilities: selfAnalysis.capabilityAssessment.currentCapabilities,
        availableResources: decisionContext.availableResources,
        constraints: decisionContext.constraints,
        priorities: ['learning', 'optimization', 'improvement'],
        timeline: '2 weeks'
      };

      const newGoals = await goalManager.generateGoals(goalContext);
      const prioritizedGoals = await goalManager.prioritizeGoals(newGoals);

      for (const goal of prioritizedGoals.slice(0, 2)) { // Limit to top 2 goals
        session.goals.push(goal);
        session.performance.goalsActive++;
      }

      // Step 5: Initiate improvement cycles
      const improvementInsights = await improvementEngine.generateImprovementInsights();
      if (improvementInsights.recommendations.length > 0) {
        const improvementCycle = await improvementEngine.initiateCycle(
          'enhancement',
          'Autonomous improvement trigger',
          improvementInsights.recommendations[0]
        );
        session.improvements.push(improvementCycle);
        session.performance.improvementsInitiated++;
      }

      // Step 6: Update performance metrics
      session.performance.overallEfficiency = this.calculateEfficiency(session);
      session.performance.learningRate = this.calculateLearningRate(session);
      session.performance.adaptationSpeed = this.calculateAdaptationSpeed(session);

      await this.saveSession(session);
      await this.updateStatus();

      return true;
    } catch (error) {
      console.error('Error executing autonomy cycle:', error);
      session.status = 'failed';
      await this.saveSession(session);
      return false;
    }
  }

  async getAutonomySession(sessionId: string): Promise<AutonomySession | null> {
    const sessions = await this.loadSessions();
    return sessions.find(s => s.id === sessionId) || null;
  }

  async listAutonomySessions(): Promise<AutonomySession[]> {
    return await this.loadSessions();
  }

  async getAutonomyPerformance(sessionId: string): Promise<AutonomyPerformance> {
    const session = await this.getAutonomySession(sessionId);
    if (!session) {
      throw new Error(`Autonomy session with ID ${sessionId} not found`);
    }

    return session.performance;
  }

  async generateAutonomyReport(sessionId: string): Promise<AutonomyReport> {
    const session = await this.getAutonomySession(sessionId);
    if (!session) {
      throw new Error(`Autonomy session with ID ${sessionId} not found`);
    }

    const decisionSummary = this.generateDecisionSummary(session.decisions);
    const goalSummary = this.generateGoalSummary(session.goals);
    const improvementSummary = this.generateImprovementSummary(session.improvements);
    const metaAnalysisSummary = this.generateMetaAnalysisSummary(session.metaAnalysis);

    const recommendations = await this.generateRecommendations(session);
    const nextSteps = await this.generateNextSteps(session);

    return {
      sessionId,
      timestamp: new Date().toISOString(),
      summary: `Autonomy session ${sessionId} executed ${session.decisions.length} decisions, managed ${session.goals.length} goals, and initiated ${session.improvements.length} improvements.`,
      decisions: decisionSummary,
      goals: goalSummary,
      improvements: improvementSummary,
      metaAnalysis: metaAnalysisSummary,
      recommendations,
      nextSteps
    };
  }

  async setAutonomyParameters(parameters: AutonomyParameters): Promise<void> {
    await fs.writeFile(this.parametersFile, JSON.stringify(parameters, null, 2));
  }

  async getAutonomyStatus(): Promise<AutonomyStatus> {
    const sessions = await this.loadSessions();
    const activeSession = sessions.find(s => s.status === 'active');
    const lastSession = sessions[sessions.length - 1];

    const performance = activeSession?.performance || {
      decisionsExecuted: 0,
      decisionsSuccessful: 0,
      goalsCompleted: 0,
      goalsActive: 0,
      improvementsInitiated: 0,
      improvementsCompleted: 0,
      overallEfficiency: 0,
      learningRate: 0,
      adaptationSpeed: 0
    };

    const health = this.assessHealth(performance);
    const recommendations = await this.generateStatusRecommendations(performance);

    return {
      isActive: !!activeSession,
      currentSession: activeSession?.id,
      lastActivity: lastSession?.startTime || 'Never',
      performance,
      health,
      recommendations
    };
  }

  // Private helper methods
  private calculateEfficiency(session: AutonomySession): number {
    if (session.decisions.length === 0) return 0;
    return session.performance.decisionsSuccessful / session.performance.decisionsExecuted;
  }

  private calculateLearningRate(session: AutonomySession): number {
    if (session.metaAnalysis.length < 2) return 0;
    const recent = session.metaAnalysis.slice(-2);
    return recent[1].confidence - recent[0].confidence;
  }

  private calculateAdaptationSpeed(session: AutonomySession): number {
    if (session.improvements.length === 0) return 0;
    const completed = session.improvements.filter(i => i.status === 'completed').length;
    return completed / session.improvements.length;
  }

  private generateDecisionSummary(decisions: AutonomousDecision[]): DecisionSummary {
    const byType: Record<string, number> = {};
    const byPriority: Record<string, number> = {};
    let totalImpact = 0;

    decisions.forEach(decision => {
      byType[decision.type] = (byType[decision.type] || 0) + 1;
      byPriority[decision.priority] = (byPriority[decision.priority] || 0) + 1;
      if (decision.success) {
        totalImpact += 1;
      }
    });

    return {
      total: decisions.length,
      successful: decisions.filter(d => d.success).length,
      failed: decisions.filter(d => !d.success).length,
      byType,
      byPriority,
      averageImpact: decisions.length > 0 ? totalImpact / decisions.length : 0
    };
  }

  private generateGoalSummary(goals: AutonomousGoal[]): GoalSummary {
    const byCategory: Record<string, number> = {};
    let totalProgress = 0;

    goals.forEach(goal => {
      byCategory[goal.category] = (byCategory[goal.category] || 0) + 1;
      totalProgress += goal.progress;
    });

    return {
      total: goals.length,
      completed: goals.filter(g => g.status === 'completed').length,
      active: goals.filter(g => g.status === 'active').length,
      byCategory,
      averageProgress: goals.length > 0 ? totalProgress / goals.length : 0,
      successRate: goals.length > 0 ? goals.filter(g => g.status === 'completed').length / goals.length : 0
    };
  }

  private generateImprovementSummary(improvements: ImprovementCycle[]): ImprovementSummary {
    const byType: Record<string, number> = {};
    let totalImpact = 0;

    improvements.forEach(improvement => {
      byType[improvement.type] = (byType[improvement.type] || 0) + 1;
      if (improvement.results.success) {
        totalImpact += improvement.results.impact;
      }
    });

    return {
      total: improvements.length,
      completed: improvements.filter(i => i.status === 'completed').length,
      failed: improvements.filter(i => i.status === 'failed').length,
      byType,
      averageImpact: improvements.length > 0 ? totalImpact / improvements.length : 0,
      successRate: improvements.length > 0 ? improvements.filter(i => i.status === 'completed').length / improvements.length : 0
    };
  }

  private generateMetaAnalysisSummary(metaAnalysis: MetaCognitiveState[]): MetaAnalysisSummary {
    if (metaAnalysis.length === 0) {
      return {
        selfAwarenessLevel: 'unknown',
        confidenceLevel: 0,
        limitationsCount: 0,
        uncertaintiesCount: 0,
        learningEffectiveness: 0
      };
    }

    const latest = metaAnalysis[metaAnalysis.length - 1];
    return {
      selfAwarenessLevel: latest.selfAwareness.level,
      confidenceLevel: latest.confidence.overall,
      limitationsCount: latest.limitations.length,
      uncertaintiesCount: latest.uncertainties.length,
      learningEffectiveness: latest.learningStrategy.effectiveness
    };
  }

  private async generateRecommendations(session: AutonomySession): Promise<string[]> {
    const recommendations: string[] = [];

    if (session.performance.decisionsExecuted > 0) {
      const successRate = session.performance.decisionsSuccessful / session.performance.decisionsExecuted;
      if (successRate < 0.7) {
        recommendations.push('Improve decision-making success rate through better analysis and validation');
      }
    }

    if (session.performance.goalsActive > 5) {
      recommendations.push('Consider reducing active goals to focus on high-priority objectives');
    }

    if (session.performance.learningRate < 0.1) {
      recommendations.push('Enhance learning mechanisms to improve adaptation speed');
    }

    return recommendations;
  }

  private async generateNextSteps(session: AutonomySession): Promise<string[]> {
    const nextSteps: string[] = [];

    nextSteps.push('Continue monitoring autonomy performance and adjust parameters as needed');
    nextSteps.push('Implement recommendations from meta-analysis');
    nextSteps.push('Scale successful strategies to broader system components');

    return nextSteps;
  }

  private assessHealth(performance: AutonomyPerformance): 'excellent' | 'good' | 'fair' | 'poor' {
    const efficiency = performance.overallEfficiency;
    const learningRate = performance.learningRate;

    if (efficiency > 0.8 && learningRate > 0.1) return 'excellent';
    if (efficiency > 0.6 && learningRate > 0.05) return 'good';
    if (efficiency > 0.4) return 'fair';
    return 'poor';
  }

  private async generateStatusRecommendations(performance: AutonomyPerformance): Promise<string[]> {
    const recommendations: string[] = [];

    if (performance.overallEfficiency < 0.6) {
      recommendations.push('Review and optimize decision-making processes');
    }

    if (performance.learningRate < 0.05) {
      recommendations.push('Enhance learning mechanisms and feedback loops');
    }

    if (performance.adaptationSpeed < 0.5) {
      recommendations.push('Improve adaptation mechanisms for faster response to changes');
    }

    return recommendations;
  }

  private async loadSessions(): Promise<AutonomySession[]> {
    try {
      const data = await fs.readFile(this.sessionsFile, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      return [];
    }
  }

  private async saveSession(session: AutonomySession): Promise<void> {
    try {
      const sessions = await this.loadSessions();
      const existingIndex = sessions.findIndex(s => s.id === session.id);
      
      if (existingIndex >= 0) {
        sessions[existingIndex] = session;
      } else {
        sessions.push(session);
      }

      await fs.writeFile(this.sessionsFile, JSON.stringify(sessions, null, 2));
    } catch (error) {
      console.error('Error saving autonomy session:', error);
    }
  }

  private async updateStatus(): Promise<void> {
    const status = await this.getAutonomyStatus();
    await fs.writeFile(this.statusFile, JSON.stringify(status, null, 2));
  }
}

export const autonomyController = new OMIAutonomyController(); 