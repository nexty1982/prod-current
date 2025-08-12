import { v4 as uuidv4 } from 'uuid';
import fs from 'fs/promises';
import path from 'path';

export interface AutonomousGoal {
  id: string;
  title: string;
  description: string;
  category: 'learning' | 'optimization' | 'improvement' | 'maintenance' | 'research' | 'development';
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'pending' | 'active' | 'paused' | 'completed' | 'failed';
  progress: number; // 0-100
  createdAt: string;
  targetDate?: string;
  startedAt?: string;
  completedAt?: string;
  milestones: GoalMilestone[];
  dependencies: string[]; // IDs of other goals
  resources: string[];
  constraints: string[];
  successCriteria: string[];
  metrics: GoalMetrics;
}

export interface GoalMilestone {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'completed';
  dueDate?: string;
  completedAt?: string;
  progress: number; // 0-100
}

export interface GoalMetrics {
  targetValue: number;
  currentValue: number;
  unit: string;
  trend: 'improving' | 'stable' | 'declining';
  lastUpdated: string;
}

export interface GoalContext {
  currentCapabilities: Record<string, number>;
  availableResources: string[];
  constraints: string[];
  priorities: string[];
  timeline: string;
}

export interface GoalManager {
  createGoal(goal: Omit<AutonomousGoal, 'id' | 'createdAt' | 'progress' | 'metrics'>): Promise<AutonomousGoal>;
  getGoal(goalId: string): Promise<AutonomousGoal | null>;
  updateGoal(goalId: string, updates: Partial<AutonomousGoal>): Promise<void>;
  deleteGoal(goalId: string): Promise<void>;
  listGoals(status?: AutonomousGoal['status'], category?: AutonomousGoal['category']): Promise<AutonomousGoal[]>;
  startGoal(goalId: string): Promise<void>;
  pauseGoal(goalId: string): Promise<void>;
  completeGoal(goalId: string): Promise<void>;
  updateProgress(goalId: string, progress: number): Promise<void>;
  addMilestone(goalId: string, milestone: Omit<GoalMilestone, 'id' | 'status' | 'progress'>): Promise<GoalMilestone>;
  completeMilestone(goalId: string, milestoneId: string): Promise<void>;
  generateGoals(context: GoalContext): Promise<AutonomousGoal[]>;
  prioritizeGoals(goals: AutonomousGoal[]): Promise<AutonomousGoal[]>;
  checkDependencies(goalId: string): Promise<{ satisfied: boolean; blocking: string[] }>;
  trackGoalHistory(): Promise<AutonomousGoal[]>;
  getGoalAnalytics(): Promise<{ totalGoals: number; completedGoals: number; successRate: number; averageProgress: number }>;
}

export class OMIGoalManager implements GoalManager {
  private goalsFile: string;
  private analyticsFile: string;

  constructor() {
    const autonomyDir = path.join(__dirname, '../memory');
    this.goalsFile = path.join(autonomyDir, 'autonomous-goals.json');
    this.analyticsFile = path.join(autonomyDir, 'goal-analytics.json');
  }

  async createGoal(goal: Omit<AutonomousGoal, 'id' | 'createdAt' | 'progress' | 'metrics'>): Promise<AutonomousGoal> {
    const newGoal: AutonomousGoal = {
      ...goal,
      id: uuidv4(),
      createdAt: new Date().toISOString(),
      progress: 0,
      metrics: {
        targetValue: 100,
        currentValue: 0,
        unit: 'percentage',
        trend: 'stable',
        lastUpdated: new Date().toISOString()
      }
    };

    const goals = await this.loadGoals();
    goals.push(newGoal);
    await this.saveGoals(goals);

    return newGoal;
  }

  async getGoal(goalId: string): Promise<AutonomousGoal | null> {
    const goals = await this.loadGoals();
    return goals.find(goal => goal.id === goalId) || null;
  }

  async updateGoal(goalId: string, updates: Partial<AutonomousGoal>): Promise<void> {
    const goals = await this.loadGoals();
    const goalIndex = goals.findIndex(goal => goal.id === goalId);
    
    if (goalIndex === -1) {
      throw new Error(`Goal with ID ${goalId} not found`);
    }

    goals[goalIndex] = { ...goals[goalIndex], ...updates };
    await this.saveGoals(goals);
  }

  async deleteGoal(goalId: string): Promise<void> {
    const goals = await this.loadGoals();
    const filteredGoals = goals.filter(goal => goal.id !== goalId);
    await this.saveGoals(filteredGoals);
  }

  async listGoals(status?: AutonomousGoal['status'], category?: AutonomousGoal['category']): Promise<AutonomousGoal[]> {
    const goals = await this.loadGoals();
    
    return goals.filter(goal => {
      if (status && goal.status !== status) return false;
      if (category && goal.category !== category) return false;
      return true;
    });
  }

  async startGoal(goalId: string): Promise<void> {
    const goal = await this.getGoal(goalId);
    if (!goal) {
      throw new Error(`Goal with ID ${goalId} not found`);
    }

    if (goal.status === 'active') {
      throw new Error('Goal is already active');
    }

    // Check dependencies
    const dependencyCheck = await this.checkDependencies(goalId);
    if (!dependencyCheck.satisfied) {
      throw new Error(`Goal dependencies not satisfied: ${dependencyCheck.blocking.join(', ')}`);
    }

    await this.updateGoal(goalId, {
      status: 'active',
      startedAt: new Date().toISOString()
    });
  }

  async pauseGoal(goalId: string): Promise<void> {
    const goal = await this.getGoal(goalId);
    if (!goal) {
      throw new Error(`Goal with ID ${goalId} not found`);
    }

    if (goal.status !== 'active') {
      throw new Error('Goal is not active');
    }

    await this.updateGoal(goalId, { status: 'paused' });
  }

  async completeGoal(goalId: string): Promise<void> {
    const goal = await this.getGoal(goalId);
    if (!goal) {
      throw new Error(`Goal with ID ${goalId} not found`);
    }

    await this.updateGoal(goalId, {
      status: 'completed',
      progress: 100,
      completedAt: new Date().toISOString(),
      metrics: {
        ...goal.metrics,
        currentValue: 100,
        lastUpdated: new Date().toISOString()
      }
    });
  }

  async updateProgress(goalId: string, progress: number): Promise<void> {
    const goal = await this.getGoal(goalId);
    if (!goal) {
      throw new Error(`Goal with ID ${goalId} not found`);
    }

    const clampedProgress = Math.max(0, Math.min(100, progress));
    const trend = clampedProgress > goal.progress ? 'improving' : 
                  clampedProgress < goal.progress ? 'declining' : 'stable';

    await this.updateGoal(goalId, {
      progress: clampedProgress,
      metrics: {
        ...goal.metrics,
        currentValue: clampedProgress,
        trend,
        lastUpdated: new Date().toISOString()
      }
    });
  }

  async addMilestone(goalId: string, milestone: Omit<GoalMilestone, 'id' | 'status' | 'progress'>): Promise<GoalMilestone> {
    const goal = await this.getGoal(goalId);
    if (!goal) {
      throw new Error(`Goal with ID ${goalId} not found`);
    }

    const newMilestone: GoalMilestone = {
      ...milestone,
      id: uuidv4(),
      status: 'pending',
      progress: 0
    };

    goal.milestones.push(newMilestone);
    await this.updateGoal(goalId, { milestones: goal.milestones });

    return newMilestone;
  }

  async completeMilestone(goalId: string, milestoneId: string): Promise<void> {
    const goal = await this.getGoal(goalId);
    if (!goal) {
      throw new Error(`Goal with ID ${goalId} not found`);
    }

    const milestoneIndex = goal.milestones.findIndex(m => m.id === milestoneId);
    if (milestoneIndex === -1) {
      throw new Error(`Milestone with ID ${milestoneId} not found`);
    }

    goal.milestones[milestoneIndex] = {
      ...goal.milestones[milestoneIndex],
      status: 'completed',
      progress: 100,
      completedAt: new Date().toISOString()
    };

    // Update overall goal progress
    const completedMilestones = goal.milestones.filter(m => m.status === 'completed').length;
    const totalMilestones = goal.milestones.length;
    const newProgress = totalMilestones > 0 ? (completedMilestones / totalMilestones) * 100 : goal.progress;

    await this.updateGoal(goalId, {
      milestones: goal.milestones,
      progress: newProgress
    });
  }

  async generateGoals(context: GoalContext): Promise<AutonomousGoal[]> {
    const goals: AutonomousGoal[] = [];

    // Generate learning goals based on capability gaps
    Object.entries(context.currentCapabilities).forEach(([capability, score]) => {
      if (score < 0.8) {
        goals.push({
          id: uuidv4(),
          title: `Improve ${capability} capability`,
          description: `Enhance ${capability} from current level ${(score * 100).toFixed(0)}% to target 80%`,
          category: 'learning',
          priority: score < 0.5 ? 'high' : 'medium',
          status: 'pending',
          progress: 0,
          createdAt: new Date().toISOString(),
          targetDate: this.calculateTargetDate(score < 0.5 ? 'high' : 'medium'),
          milestones: [
            {
              id: uuidv4(),
              title: 'Assess current capability',
              description: 'Evaluate current performance in this area',
              status: 'pending',
              progress: 0
            },
            {
              id: uuidv4(),
              title: 'Develop improvement plan',
              description: 'Create detailed plan for capability enhancement',
              status: 'pending',
              progress: 0
            },
            {
              id: uuidv4(),
              title: 'Implement improvements',
              description: 'Execute the improvement plan',
              status: 'pending',
              progress: 0
            },
            {
              id: uuidv4(),
              title: 'Validate improvements',
              description: 'Test and validate the enhanced capability',
              status: 'pending',
              progress: 0
            }
          ],
          dependencies: [],
          resources: context.availableResources,
          constraints: context.constraints,
          successCriteria: [`Achieve ${capability} score of 80% or higher`],
          metrics: {
            targetValue: 80,
            currentValue: score * 100,
            unit: 'percentage',
            trend: 'stable',
            lastUpdated: new Date().toISOString()
          }
        });
      }
    });

    // Generate optimization goals
    if (context.constraints.includes('performance')) {
      goals.push({
        id: uuidv4(),
        title: 'Optimize system performance',
        description: 'Improve overall system performance and efficiency',
        category: 'optimization',
        priority: 'high',
        status: 'pending',
        progress: 0,
        createdAt: new Date().toISOString(),
        targetDate: this.calculateTargetDate('high'),
        milestones: [
          {
            id: uuidv4(),
            title: 'Performance audit',
            description: 'Conduct comprehensive performance analysis',
            status: 'pending',
            progress: 0
          },
          {
            id: uuidv4(),
            title: 'Identify bottlenecks',
            description: 'Identify and document performance bottlenecks',
            status: 'pending',
            progress: 0
          },
          {
            id: uuidv4(),
            title: 'Implement optimizations',
            description: 'Apply performance optimizations',
            status: 'pending',
            progress: 0
          },
          {
            id: uuidv4(),
            title: 'Performance testing',
            description: 'Test and validate performance improvements',
            status: 'pending',
            progress: 0
          }
        ],
        dependencies: [],
        resources: context.availableResources,
        constraints: context.constraints,
        successCriteria: ['Achieve 20% performance improvement', 'Reduce response time by 30%'],
        metrics: {
          targetValue: 120,
          currentValue: 100,
          unit: 'performance_index',
          trend: 'stable',
          lastUpdated: new Date().toISOString()
        }
      });
    }

    return goals;
  }

  async prioritizeGoals(goals: AutonomousGoal[]): Promise<AutonomousGoal[]> {
    return goals.sort((a, b) => {
      const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      const categoryOrder = { maintenance: 5, optimization: 4, improvement: 3, learning: 2, research: 1, development: 0 };
      
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
      if (priorityDiff !== 0) return priorityDiff;
      
      return categoryOrder[b.category] - categoryOrder[a.category];
    });
  }

  async checkDependencies(goalId: string): Promise<{ satisfied: boolean; blocking: string[] }> {
    const goal = await this.getGoal(goalId);
    if (!goal) {
      return { satisfied: false, blocking: ['Goal not found'] };
    }

    if (goal.dependencies.length === 0) {
      return { satisfied: true, blocking: [] };
    }

    const blocking: string[] = [];
    for (const dependencyId of goal.dependencies) {
      const dependency = await this.getGoal(dependencyId);
      if (!dependency || dependency.status !== 'completed') {
        blocking.push(dependencyId);
      }
    }

    return {
      satisfied: blocking.length === 0,
      blocking
    };
  }

  async trackGoalHistory(): Promise<AutonomousGoal[]> {
    return await this.loadGoals();
  }

  async getGoalAnalytics(): Promise<{ totalGoals: number; completedGoals: number; successRate: number; averageProgress: number }> {
    const goals = await this.loadGoals();
    
    const totalGoals = goals.length;
    const completedGoals = goals.filter(goal => goal.status === 'completed').length;
    const successRate = totalGoals > 0 ? (completedGoals / totalGoals) * 100 : 0;
    const averageProgress = goals.length > 0 ? 
      goals.reduce((sum, goal) => sum + goal.progress, 0) / goals.length : 0;

    return {
      totalGoals,
      completedGoals,
      successRate,
      averageProgress
    };
  }

  // Private helper methods
  private async loadGoals(): Promise<AutonomousGoal[]> {
    try {
      const data = await fs.readFile(this.goalsFile, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      return [];
    }
  }

  private async saveGoals(goals: AutonomousGoal[]): Promise<void> {
    try {
      await fs.writeFile(this.goalsFile, JSON.stringify(goals, null, 2));
    } catch (error) {
      console.error('Error saving goals:', error);
    }
  }

  private calculateTargetDate(priority: 'low' | 'medium' | 'high' | 'critical'): string {
    const now = new Date();
    const daysToAdd = {
      low: 30,
      medium: 14,
      high: 7,
      critical: 3
    };
    
    const targetDate = new Date(now.getTime() + daysToAdd[priority] * 24 * 60 * 60 * 1000);
    return targetDate.toISOString();
  }
}

export const goalManager = new OMIGoalManager(); 