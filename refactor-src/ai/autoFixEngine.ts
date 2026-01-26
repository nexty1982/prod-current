import { ComponentInfo } from '../hooks/useComponentRegistry';
import { editorBridge, FixResponse } from '../services/om-ai/editorBridge';
import { ErrorClassifier, IssueSeverity, DetectedIssue } from './errorClassifier';
import { RecoveryActions, FixStrategy, FixResult } from './recoveryActions';
import { FixLogger, FixRecord } from './fixLogger';

export interface AutoFixConfig {
  enabled: boolean;
  confidenceThreshold: number;
  manualReviewRequired: boolean;
  lockdownMode: boolean;
  maxRetries: number;
  retryDelay: number;
}

export interface AutoFixContext {
  component: ComponentInfo;
  detectedIssues: DetectedIssue[];
  userRole: string;
  environment: 'development' | 'staging' | 'production';
}

export interface AutoFixResult {
  success: boolean;
  appliedFixes: FixResult[];
  confidence: number;
  rollbackId?: string;
  error?: string;
  retryCount: number;
}

export class AutoFixEngine {
  private config: AutoFixConfig;
  private errorClassifier: ErrorClassifier;
  private recoveryActions: RecoveryActions;
  private fixLogger: FixLogger;
  private isRunning: boolean = false;

  constructor(config: Partial<AutoFixConfig> = {}) {
    this.config = {
      enabled: true,
      confidenceThreshold: 0.7,
      manualReviewRequired: false,
      lockdownMode: false,
      maxRetries: 3,
      retryDelay: 1000,
      ...config
    };

    this.errorClassifier = new ErrorClassifier();
    this.recoveryActions = new RecoveryActions();
    this.fixLogger = new FixLogger();
  }

  /**
   * Main entry point for autonomous component fixing
   */
  async autoFixComponent(context: AutoFixContext): Promise<AutoFixResult> {
    if (!this.config.enabled || this.config.lockdownMode) {
      return {
        success: false,
        appliedFixes: [],
        confidence: 0,
        retryCount: 0,
        error: 'Auto-fix is disabled or in lockdown mode'
      };
    }

    if (this.isRunning) {
      return {
        success: false,
        appliedFixes: [],
        confidence: 0,
        retryCount: 0,
        error: 'Auto-fix engine is already running'
      };
    }

    this.isRunning = true;
    let retryCount = 0;

    try {
      // Step 1: Detect issues
      const detectedIssues = await this.errorClassifier.detectIssues(context.component);
      
      if (detectedIssues.length === 0) {
        return {
          success: true,
          appliedFixes: [],
          confidence: 1.0,
          retryCount: 0
        };
      }

      // Step 2: Prioritize issues by severity
      const prioritizedIssues = this.errorClassifier.prioritizeIssues(detectedIssues);
      
      // Step 3: Calculate overall confidence
      const confidence = this.calculateConfidence(prioritizedIssues);
      
      if (confidence < this.config.confidenceThreshold) {
        return {
          success: false,
          appliedFixes: [],
          confidence,
          retryCount: 0,
          error: `Confidence (${confidence}) below threshold (${this.config.confidenceThreshold})`
        };
      }

      // Step 4: Apply fixes with retry logic
      const result = await this.applyFixesWithRetry(context, prioritizedIssues, retryCount);
      
      // Step 5: Log the fix attempt
      const fixRecord: FixRecord = {
        id: this.generateFixId(),
        componentId: context.component.id,
        componentName: context.component.name,
        timestamp: new Date().toISOString(),
        issues: detectedIssues,
        appliedFixes: result.appliedFixes,
        confidence,
        userRole: context.userRole,
        environment: context.environment,
        success: result.success,
        error: result.error,
        retryCount: result.retryCount
      };

      await this.fixLogger.logFix(fixRecord);

      return {
        ...result,
        rollbackId: fixRecord.id
      };

    } catch (error) {
      const errorResult: AutoFixResult = {
        success: false,
        appliedFixes: [],
        confidence: 0,
        retryCount,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };

      await this.fixLogger.logFix({
        id: this.generateFixId(),
        componentId: context.component.id,
        componentName: context.component.name,
        timestamp: new Date().toISOString(),
        issues: [],
        appliedFixes: [],
        confidence: 0,
        userRole: context.userRole,
        environment: context.environment,
        success: false,
        error: errorResult.error,
        retryCount
      });

      return errorResult;
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Apply fixes with automatic retry logic
   */
  private async applyFixesWithRetry(
    context: AutoFixContext,
    issues: DetectedIssue[],
    retryCount: number
  ): Promise<AutoFixResult> {
    let lastError: string | undefined;

    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      try {
        const appliedFixes: FixResult[] = [];

        // Apply fixes for each issue
        for (const issue of issues) {
          const fixStrategy = this.recoveryActions.getFixStrategy(issue);
          
          if (fixStrategy) {
            const fixResult = await this.recoveryActions.applyFix(
              context.component,
              issue,
              fixStrategy
            );

            if (fixResult.success) {
              appliedFixes.push(fixResult);
            } else {
              console.warn(`Fix failed for issue ${issue.type}:`, fixResult.error);
            }
          }
        }

        // Verify fixes using OMAI
        const verificationResult = await this.verifyFixes(context.component, appliedFixes);
        
        if (verificationResult.success) {
          return {
            success: true,
            appliedFixes,
            confidence: this.calculateConfidence(issues),
            retryCount: attempt
          };
        } else {
          lastError = verificationResult.error;
          
          // Rollback applied fixes before retry
          await this.rollbackFixes(appliedFixes);
          
          if (attempt < this.config.maxRetries) {
            await this.delay(this.config.retryDelay * (attempt + 1));
          }
        }

      } catch (error) {
        lastError = error instanceof Error ? error.message : 'Unknown error';
        
        if (attempt < this.config.maxRetries) {
          await this.delay(this.config.retryDelay * (attempt + 1));
        }
      }
    }

    return {
      success: false,
      appliedFixes: [],
      confidence: 0,
      retryCount,
      error: lastError || 'Max retries exceeded'
    };
  }

  /**
   * Verify fixes using OMAI analysis
   */
  private async verifyFixes(component: ComponentInfo, appliedFixes: FixResult[]): Promise<{ success: boolean; error?: string }> {
    try {
      const omaiResponse = await editorBridge.analyzeComponent(component);
      
      if (omaiResponse.success) {
        // Check if OMAI confirms the fixes resolved the issues
        const remainingIssues = omaiResponse.issues || [];
        
        if (remainingIssues.length === 0) {
          return { success: true };
        } else {
          return {
            success: false,
            error: `OMAI detected ${remainingIssues.length} remaining issues after fixes`
          };
        }
      } else {
        return {
          success: false,
          error: omaiResponse.error || 'OMAI verification failed'
        };
      }
    } catch (error) {
      return {
        success: false,
        error: `OMAI verification error: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Rollback applied fixes
   */
  private async rollbackFixes(appliedFixes: FixResult[]): Promise<void> {
    for (const fix of appliedFixes) {
      if (fix.rollback) {
        try {
          await fix.rollback();
        } catch (error) {
          console.error(`Failed to rollback fix ${fix.id}:`, error);
        }
      }
    }
  }

  /**
   * Calculate confidence score based on issue severity and count
   */
  private calculateConfidence(issues: DetectedIssue[]): number {
    if (issues.length === 0) return 1.0;

    const severityWeights = {
      [IssueSeverity.CRITICAL]: 0.9,
      [IssueSeverity.WARNING]: 0.7,
      [IssueSeverity.INFO]: 0.5
    };

    const totalWeight = issues.reduce((sum, issue) => {
      return sum + (severityWeights[issue.severity] || 0.5);
    }, 0);

    const averageWeight = totalWeight / issues.length;
    const issueCountPenalty = Math.min(issues.length * 0.1, 0.3);

    return Math.max(0, Math.min(1, averageWeight - issueCountPenalty));
  }

  /**
   * Generate unique fix ID
   */
  private generateFixId(): string {
    return `fix_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Utility delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<AutoFixConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Get current configuration
   */
  getConfig(): AutoFixConfig {
    return { ...this.config };
  }

  /**
   * Get fix history for a component
   */
  async getFixHistory(componentId: string): Promise<FixRecord[]> {
    return this.fixLogger.getFixHistory(componentId);
  }

  /**
   * Rollback a specific fix
   */
  async rollbackFix(fixId: string): Promise<boolean> {
    const fixRecord = await this.fixLogger.getFixById(fixId);
    
    if (!fixRecord) {
      throw new Error(`Fix record not found: ${fixId}`);
    }

    return this.rollbackFixes(fixRecord.appliedFixes).then(() => true);
  }
}

// Export singleton instance
export const autoFixEngine = new AutoFixEngine(); 