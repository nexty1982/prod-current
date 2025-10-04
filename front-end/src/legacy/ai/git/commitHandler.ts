import { gitOpsBridge, GitOpsResult, GitOpsContext } from './gitOpsBridge';
import { gitConfigManager } from './config';

export interface CommitData {
  branchName: string;
  commitMessage: string;
  files: string[];
  commitHash?: string;
  timestamp: string;
}

export interface CommitResult {
  success: boolean;
  error?: string;
  commitData?: CommitData;
  warnings?: string[];
}

export interface StagedChanges {
  componentName: string;
  files: string[];
  changes: Record<string, any>;
  beforeSnapshot?: string;
  afterSnapshot?: string;
}

export class CommitHandler {
  private stagedChanges: Map<string, StagedChanges> = new Map();
  
  async stageFixChanges(context: GitOpsContext): Promise<CommitResult> {
    try {
      // Validate context
      if (!context.componentName || !context.issueSummary) {
        return { success: false, error: 'Invalid context: missing component name or issue summary' };
      }
      
      if (context.confidence < gitConfigManager.getConfig().commitConfidenceThreshold) {
        return { 
          success: false, 
          error: `Confidence threshold not met: ${Math.round(context.confidence * 100)}% < ${Math.round(gitConfigManager.getConfig().commitConfidenceThreshold * 100)}%` 
        };
      }
      
      // Generate branch name
      const branchName = gitConfigManager.generateBranchName(context.componentName);
      
      // Stage the changes
      const stagedChange: StagedChanges = {
        componentName: context.componentName,
        files: this.detectChangedFiles(context),
        changes: this.extractChanges(context),
        beforeSnapshot: context.beforeSnapshot,
        afterSnapshot: context.afterSnapshot
      };
      
      this.stagedChanges.set(context.componentName, stagedChange);
      
      // Log the staging
      await gitOpsBridge.logGitOpsEvent('fix_staged', {
        componentName: context.componentName,
        branchName,
        confidence: context.confidence,
        appliedFixes: context.appliedFixes
      });
      
      return {
        success: true,
        commitData: {
          branchName,
          commitMessage: gitConfigManager.generateCommitMessage(
            context.componentName,
            context.issueSummary,
            context.confidence
          ),
          files: stagedChange.files,
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to stage fix changes: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
  
  async commitStagedChanges(context: GitOpsContext): Promise<CommitResult> {
    try {
      const stagedChange = this.stagedChanges.get(context.componentName);
      if (!stagedChange) {
        return { success: false, error: 'No staged changes found for component' };
      }
      
      // Initialize GitOps bridge
      const initResult = await gitOpsBridge.initialize();
      if (!initResult.success) {
        return { 
          success: false, 
          error: `GitOps initialization failed: ${initResult.error}`,
          warnings: initResult.warnings
        };
      }
      
      // Validate repository
      const validationResult = await gitOpsBridge.validateRepository();
      if (!validationResult.success) {
        return { 
          success: false, 
          error: `Repository validation failed: ${validationResult.error}`,
          warnings: ['Git operations will be simulated']
        };
      }
      
      // Generate branch name and commit message
      const branchName = gitConfigManager.generateBranchName(context.componentName);
      const commitMessage = gitConfigManager.generateCommitMessage(
        context.componentName,
        context.issueSummary,
        context.confidence
      );
      
      // Create new branch
      const branchResult = await gitOpsBridge.createBranch(branchName);
      if (!branchResult.success) {
        return { 
          success: false, 
          error: `Failed to create branch: ${branchResult.error}` 
        };
      }
      
      // Stage files (in a real implementation, this would modify actual files)
      const filesToStage = this.prepareFilesForStaging(stagedChange);
      
      // Commit changes
      const commitResult = await gitOpsBridge.commitChanges(commitMessage, filesToStage);
      if (!commitResult.success) {
        return { 
          success: false, 
          error: `Failed to commit changes: ${commitResult.error}` 
        };
      }
      
      // Push branch
      const pushResult = await gitOpsBridge.pushBranch(branchName);
      if (!pushResult.success) {
        return { 
          success: false, 
          error: `Failed to push branch: ${pushResult.error}`,
          warnings: ['Changes committed locally but not pushed to remote']
        };
      }
      
      // Log successful commit
      await gitOpsBridge.logGitOpsEvent('fix_committed', {
        componentName: context.componentName,
        branchName,
        commitHash: commitResult.data?.hash,
        confidence: context.confidence,
        appliedFixes: context.appliedFixes
      });
      
      // Clean up staged changes
      this.stagedChanges.delete(context.componentName);
      
      return {
        success: true,
        commitData: {
          branchName,
          commitMessage,
          files: stagedChange.files,
          commitHash: commitResult.data?.hash,
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to commit staged changes: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
  
  async autoCommitFix(context: GitOpsContext): Promise<CommitResult> {
    try {
      // Check if auto-commit is enabled
      if (!gitConfigManager.getConfig().autoCommitEnabled) {
        return { 
          success: false, 
          error: 'Auto-commit is disabled in configuration' 
        };
      }
      
      // Stage changes first
      const stageResult = await this.stageFixChanges(context);
      if (!stageResult.success) {
        return stageResult;
      }
      
      // Commit staged changes
      const commitResult = await this.commitStagedChanges(context);
      
      return commitResult;
    } catch (error) {
      return {
        success: false,
        error: `Auto-commit failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
  
  getStagedChanges(componentName?: string): StagedChanges[] {
    if (componentName) {
      const change = this.stagedChanges.get(componentName);
      return change ? [change] : [];
    }
    return Array.from(this.stagedChanges.values());
  }
  
  clearStagedChanges(componentName?: string): void {
    if (componentName) {
      this.stagedChanges.delete(componentName);
    } else {
      this.stagedChanges.clear();
    }
  }
  
  private detectChangedFiles(context: GitOpsContext): string[] {
    // In a real implementation, this would analyze the actual file changes
    // For now, we'll simulate based on the component name and applied fixes
    const baseFiles = [
      `front-end/src/shared/ui/legacy/${context.componentName}.tsx`,
      `front-end/src/shared/ui/legacy/${context.componentName}.css`
    ];
    
    // Add files based on applied fixes
    const additionalFiles: string[] = [];
    context.appliedFixes.forEach(fix => {
      if (fix.includes('style') || fix.includes('css')) {
        additionalFiles.push(`front-end/src/styles/${context.componentName}.css`);
      }
      if (fix.includes('hook') || fix.includes('state')) {
        additionalFiles.push(`front-end/src/hooks/use${context.componentName}.ts`);
      }
      if (fix.includes('api') || fix.includes('service')) {
        additionalFiles.push(`front-end/src/services/${context.componentName}Service.ts`);
      }
    });
    
    return [...baseFiles, ...additionalFiles].filter((file, index, arr) => arr.indexOf(file) === index);
  }
  
  private extractChanges(context: GitOpsContext): Record<string, any> {
    // Extract meaningful changes from the context
    const changes: Record<string, any> = {
      componentName: context.componentName,
      issueSummary: context.issueSummary,
      confidence: context.confidence,
      appliedFixes: context.appliedFixes,
      timestamp: new Date().toISOString()
    };
    
    if (context.user) {
      changes.user = context.user;
    }
    
    if (context.beforeSnapshot) {
      changes.beforeSnapshot = context.beforeSnapshot;
    }
    
    if (context.afterSnapshot) {
      changes.afterSnapshot = context.afterSnapshot;
    }
    
    return changes;
  }
  
  private prepareFilesForStaging(stagedChange: StagedChanges): string[] {
    // In a real implementation, this would prepare the actual files for Git staging
    // For now, we'll return the detected files
    return stagedChange.files;
  }
  
  async getCommitHistory(componentName?: string, limit: number = 10): Promise<CommitData[]> {
    try {
      // In a real implementation, this would query Git history
      // For now, we'll return simulated data
      const history: CommitData[] = [];
      
      if (componentName) {
        // Simulate component-specific history
        history.push({
          branchName: gitConfigManager.generateBranchName(componentName),
          commitMessage: gitConfigManager.generateCommitMessage(componentName, 'Simulated fix', 0.85),
          files: [`front-end/src/shared/ui/legacy/${componentName}.tsx`],
          commitHash: `simulated-${Date.now()}`,
          timestamp: new Date().toISOString()
        });
      } else {
        // Simulate general history
        const components = ['UserTable', 'DashboardCard', 'NavigationMenu'];
        components.forEach((comp, index) => {
          history.push({
            branchName: gitConfigManager.generateBranchName(comp),
            commitMessage: gitConfigManager.generateCommitMessage(comp, `Fix ${index + 1}`, 0.8 + index * 0.05),
            files: [`front-end/src/shared/ui/legacy/${comp}.tsx`],
            commitHash: `simulated-${Date.now()}-${index}`,
            timestamp: new Date(Date.now() - index * 86400000).toISOString() // Each day back
          });
        });
      }
      
      return history.slice(0, limit);
    } catch (error) {
      console.error('Failed to get commit history:', error);
      return [];
    }
  }
}

export const commitHandler = new CommitHandler(); 