import { gitOpsBridge, GitOpsContext } from './gitOpsBridge';
import { gitConfigManager } from './config';
import { CommitData } from './commitHandler';

export interface PullRequest {
  id: string;
  title: string;
  description: string;
  sourceBranch: string;
  targetBranch: string;
  status: 'open' | 'merged' | 'closed' | 'draft';
  url?: string;
  createdAt: string;
  updatedAt: string;
  author: string;
  assignees?: string[];
  labels?: string[];
  reviewers?: string[];
  mergeable?: boolean;
  conflicts?: boolean;
  comments?: PRComment[];
  commits?: CommitData[];
}

export interface PRComment {
  id: string;
  author: string;
  content: string;
  timestamp: string;
  type: 'comment' | 'review' | 'system';
}

export interface PRResult {
  success: boolean;
  error?: string;
  pullRequest?: PullRequest;
  warnings?: string[];
}

export interface PRMetadata {
  componentName: string;
  issueSummary: string;
  confidence: number;
  appliedFixes: string[];
  beforeSnapshot?: string;
  afterSnapshot?: string;
  user?: string;
  screenshots?: string[];
  testResults?: any;
}

export class PRGenerator {
  private pendingPRs: Map<string, PullRequest> = new Map();
  
  async createPullRequest(
    sourceBranch: string,
    metadata: PRMetadata,
    targetBranch?: string
  ): Promise<PRResult> {
    try {
      // Check if auto-create PR is enabled
      if (!gitConfigManager.getConfig().autoCreatePR) {
        return { 
          success: false, 
          error: 'Auto-create PR is disabled in configuration' 
        };
      }
      
      // Validate metadata
      if (!metadata.componentName || !metadata.issueSummary) {
        return { success: false, error: 'Invalid metadata: missing component name or issue summary' };
      }
      
      if (metadata.confidence < gitConfigManager.getConfig().prConfidenceThreshold) {
        return { 
          success: false, 
          error: `PR confidence threshold not met: ${Math.round(metadata.confidence * 100)}% < ${Math.round(gitConfigManager.getConfig().prConfidenceThreshold * 100)}%` 
        };
      }
      
      // Generate PR details
      const prTitle = gitConfigManager.generatePRTitle(metadata.componentName, metadata.issueSummary);
      const prDescription = gitConfigManager.generatePRDescription({
        componentName: metadata.componentName,
        issueSummary: metadata.issueSummary,
        confidence: metadata.confidence,
        appliedFixes: metadata.appliedFixes,
        beforeSnapshot: metadata.beforeSnapshot,
        afterSnapshot: metadata.afterSnapshot,
        user: metadata.user
      });
      
      const targetBranchName = targetBranch || gitConfigManager.getConfig().defaultBranch;
      
      // Create PR object
      const pullRequest: PullRequest = {
        id: this.generatePRId(),
        title: prTitle,
        description: prDescription,
        sourceBranch,
        targetBranch: targetBranchName,
        status: 'open',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        author: metadata.user || 'omai-bot',
        labels: this.generatePRLabels(metadata),
        assignees: this.generateAssignees(metadata),
        reviewers: this.generateReviewers(metadata),
        mergeable: true,
        conflicts: false,
        comments: this.generateInitialComments(metadata),
        commits: []
      };
      
      // In a real implementation, this would create the PR via Git provider API
      const apiResult = await this.createPRViaAPI(pullRequest);
      if (apiResult.success && apiResult.url) {
        pullRequest.url = apiResult.url;
        pullRequest.id = apiResult.id || pullRequest.id;
      }
      
      // Store pending PR
      this.pendingPRs.set(pullRequest.id, pullRequest);
      
      // Log PR creation
      await gitOpsBridge.logGitOpsEvent('pr_created', {
        prId: pullRequest.id,
        componentName: metadata.componentName,
        sourceBranch,
        targetBranch: targetBranchName,
        confidence: metadata.confidence,
        appliedFixes: metadata.appliedFixes
      });
      
      return {
        success: true,
        pullRequest,
        warnings: apiResult.warnings
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to create pull request: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
  
  async getPendingPRs(componentName?: string): Promise<PullRequest[]> {
    const allPRs = Array.from(this.pendingPRs.values());
    
    if (componentName) {
      return allPRs.filter(pr => 
        pr.title.toLowerCase().includes(componentName.toLowerCase()) ||
        pr.description.toLowerCase().includes(componentName.toLowerCase())
      );
    }
    
    return allPRs;
  }
  
  async getPRById(prId: string): Promise<PullRequest | null> {
    return this.pendingPRs.get(prId) || null;
  }
  
  async updatePRStatus(prId: string, status: 'open' | 'merged' | 'closed' | 'draft'): Promise<PRResult> {
    try {
      const pr = this.pendingPRs.get(prId);
      if (!pr) {
        return { success: false, error: 'Pull request not found' };
      }
      
      pr.status = status;
      pr.updatedAt = new Date().toISOString();
      
      // In a real implementation, this would update the PR via API
      await this.updatePRViaAPI(prId, { status });
      
      // Log status update
      await gitOpsBridge.logGitOpsEvent('pr_status_updated', {
        prId,
        oldStatus: pr.status,
        newStatus: status
      });
      
      return { success: true, pullRequest: pr };
    } catch (error) {
      return {
        success: false,
        error: `Failed to update PR status: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
  
  async addPRComment(prId: string, comment: Omit<PRComment, 'id' | 'timestamp'>): Promise<PRResult> {
    try {
      const pr = this.pendingPRs.get(prId);
      if (!pr) {
        return { success: false, error: 'Pull request not found' };
      }
      
      const newComment: PRComment = {
        ...comment,
        id: this.generateCommentId(),
        timestamp: new Date().toISOString()
      };
      
      pr.comments = pr.comments || [];
      pr.comments.push(newComment);
      pr.updatedAt = new Date().toISOString();
      
      // In a real implementation, this would add the comment via API
      await this.addCommentViaAPI(prId, newComment);
      
      return { success: true, pullRequest: pr };
    } catch (error) {
      return {
        success: false,
        error: `Failed to add PR comment: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
  
  async mergePR(prId: string, mergeMethod: 'merge' | 'squash' | 'rebase' = 'merge'): Promise<PRResult> {
    try {
      const pr = this.pendingPRs.get(prId);
      if (!pr) {
        return { success: false, error: 'Pull request not found' };
      }
      
      if (pr.status !== 'open') {
        return { success: false, error: 'Pull request is not open' };
      }
      
      // Check if auto-merge is enabled
      if (!gitConfigManager.getConfig().autoMergeEnabled && !pr.author.includes('omai-bot')) {
        return { success: false, error: 'Auto-merge is disabled and PR requires manual approval' };
      }
      
      // In a real implementation, this would merge the PR via API
      const mergeResult = await this.mergePRViaAPI(prId, mergeMethod);
      if (!mergeResult.success) {
        return mergeResult;
      }
      
      // Update local PR status
      pr.status = 'merged';
      pr.updatedAt = new Date().toISOString();
      
      // Log merge
      await gitOpsBridge.logGitOpsEvent('pr_merged', {
        prId,
        componentName: this.extractComponentName(pr.title),
        mergeMethod,
        author: pr.author
      });
      
      return { success: true, pullRequest: pr };
    } catch (error) {
      return {
        success: false,
        error: `Failed to merge PR: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
  
  async closePR(prId: string, reason?: string): Promise<PRResult> {
    try {
      const pr = this.pendingPRs.get(prId);
      if (!pr) {
        return { success: false, error: 'Pull request not found' };
      }
      
      pr.status = 'closed';
      pr.updatedAt = new Date().toISOString();
      
      if (reason) {
        await this.addPRComment(prId, {
          author: 'omai-bot',
          content: `PR closed: ${reason}`,
          type: 'system'
        });
      }
      
      // In a real implementation, this would close the PR via API
      await this.closePRViaAPI(prId, reason);
      
      // Log closure
      await gitOpsBridge.logGitOpsEvent('pr_closed', {
        prId,
        reason: reason || 'manual'
      });
      
      return { success: true, pullRequest: pr };
    } catch (error) {
      return {
        success: false,
        error: `Failed to close PR: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
  
  private generatePRId(): string {
    return `pr-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
  
  private generateCommentId(): string {
    return `comment-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
  
  private generatePRLabels(metadata: PRMetadata): string[] {
    const labels = ['omai-auto-fix', 'frontend'];
    
    if (metadata.confidence >= 0.9) {
      labels.push('high-confidence');
    } else if (metadata.confidence >= 0.7) {
      labels.push('medium-confidence');
    } else {
      labels.push('low-confidence');
    }
    
    if (metadata.appliedFixes.some(fix => fix.includes('style') || fix.includes('css'))) {
      labels.push('styling');
    }
    
    if (metadata.appliedFixes.some(fix => fix.includes('accessibility'))) {
      labels.push('accessibility');
    }
    
    if (metadata.appliedFixes.some(fix => fix.includes('performance'))) {
      labels.push('performance');
    }
    
    return labels;
  }
  
  private generateAssignees(metadata: PRMetadata): string[] {
    // In a real implementation, this would determine assignees based on team structure
    // For now, return empty array for auto-assignment
    return [];
  }
  
  private generateReviewers(metadata: PRMetadata): string[] {
    // In a real implementation, this would determine reviewers based on team structure
    // For now, return empty array for auto-approval
    return [];
  }
  
  private generateInitialComments(metadata: PRMetadata): PRComment[] {
    const comments: PRComment[] = [];
    
    // Add system comment about the fix
    comments.push({
      id: this.generateCommentId(),
      author: 'omai-bot',
      content: `🤖 This PR was automatically generated by the OMAI autonomous fix engine.\n\n**Confidence:** ${Math.round(metadata.confidence * 100)}%\n**Applied Fixes:** ${metadata.appliedFixes.length}\n**Component:** ${metadata.componentName}`,
      timestamp: new Date().toISOString(),
      type: 'system'
    });
    
    // Add comment about confidence level
    if (metadata.confidence < 0.8) {
      comments.push({
        id: this.generateCommentId(),
        author: 'omai-bot',
        content: `⚠️ **Low Confidence Warning:** This fix has a confidence level of ${Math.round(metadata.confidence * 100)}%. Please review carefully before merging.`,
        timestamp: new Date().toISOString(),
        type: 'system'
      });
    }
    
    return comments;
  }
  
  private extractComponentName(prTitle: string): string {
    // Extract component name from PR title
    const match = prTitle.match(/OMAI Auto-Fix: ([^-]+)/);
    return match ? match[1].trim() : 'Unknown';
  }
  
  // API integration methods (simulated for now)
  private async createPRViaAPI(pr: PullRequest): Promise<{ success: boolean; id?: string; url?: string; warnings?: string[] }> {
    // In a real implementation, this would call the Git provider's API
    // For now, simulate the API call
    return {
      success: true,
      id: pr.id,
      url: `https://github.com/orthodoxmetrics/orthodoxmetrics/pull/${pr.id}`,
      warnings: ['API integration not implemented - using simulation']
    };
  }
  
  private async updatePRViaAPI(prId: string, updates: any): Promise<{ success: boolean }> {
    // Simulate API update
    return { success: true };
  }
  
  private async addCommentViaAPI(prId: string, comment: PRComment): Promise<{ success: boolean }> {
    // Simulate API comment addition
    return { success: true };
  }
  
  private async mergePRViaAPI(prId: string, mergeMethod: string): Promise<{ success: boolean; error?: string }> {
    // Simulate API merge
    return { success: true };
  }
  
  private async closePRViaAPI(prId: string, reason?: string): Promise<{ success: boolean }> {
    // Simulate API close
    return { success: true };
  }
}

export const prGenerator = new PRGenerator(); 