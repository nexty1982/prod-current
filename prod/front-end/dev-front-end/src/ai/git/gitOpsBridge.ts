import { gitConfigManager, GitConfig } from './config';

export interface GitStatus {
  isRepo: boolean;
  currentBranch: string;
  isClean: boolean;
  hasRemote: boolean;
  lastCommit?: string;
  aheadCount: number;
  behindCount: number;
}

export interface GitCommit {
  hash: string;
  message: string;
  author: string;
  date: string;
  files: string[];
}

export interface GitBranch {
  name: string;
  isCurrent: boolean;
  isRemote: boolean;
  lastCommit?: string;
}

export interface GitDiff {
  files: string[];
  additions: number;
  deletions: number;
  diff: string;
}

export interface GitOpsResult {
  success: boolean;
  error?: string;
  data?: any;
  warnings?: string[];
}

export interface GitOpsContext {
  componentName: string;
  issueSummary: string;
  confidence: number;
  appliedFixes: string[];
  beforeSnapshot?: string;
  afterSnapshot?: string;
  user?: string;
}

export class GitOpsBridge {
  private config: GitConfig;
  private isInitialized: boolean = false;
  private git: any = null; // Will be simple-git instance
  
  constructor() {
    this.config = gitConfigManager.getConfig();
  }
  
  async initialize(): Promise<GitOpsResult> {
    try {
      if (this.isInitialized) {
        return { success: true };
      }
      
      // Check if Git is available
      if (typeof window !== 'undefined') {
        // Browser environment - use API calls instead
        this.isInitialized = true;
        return { success: true, warnings: ['Running in browser mode - Git operations will use API'] };
      }
      
      // Node.js environment - try to use simple-git
      try {
        const simpleGit = require('simple-git');
        this.git = simpleGit(this.config.repoPath);
        this.isInitialized = true;
        
        // Verify repository
        const status = await this.getStatus();
        if (!status.isRepo) {
          return { success: false, error: 'Not a Git repository' };
        }
        
        return { success: true };
      } catch (error) {
        return { 
          success: false, 
          error: `Failed to initialize Git: ${error instanceof Error ? error.message : 'Unknown error'}`,
          warnings: ['Git operations will be simulated']
        };
      }
    } catch (error) {
      return { 
        success: false, 
        error: `GitOps initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
      };
    }
  }
  
  async getStatus(): Promise<GitStatus> {
    if (!this.isInitialized) {
      await this.initialize();
    }
    
    if (!this.git) {
      // Simulate Git status for browser environment
      return {
        isRepo: true,
        currentBranch: this.config.defaultBranch,
        isClean: true,
        hasRemote: !!this.config.remoteOrigin,
        lastCommit: 'simulated-commit-hash',
        aheadCount: 0,
        behindCount: 0
      };
    }
    
    try {
      const status = await this.git.status();
      const branches = await this.git.branch();
      
      return {
        isRepo: true,
        currentBranch: branches.current,
        isClean: status.isClean(),
        hasRemote: status.tracking !== null,
        lastCommit: status.latest?.hash,
        aheadCount: status.ahead || 0,
        behindCount: status.behind || 0
      };
    } catch (error) {
      return {
        isRepo: false,
        currentBranch: '',
        isClean: false,
        hasRemote: false,
        aheadCount: 0,
        behindCount: 0
      };
    }
  }
  
  async createBranch(branchName: string): Promise<GitOpsResult> {
    if (!this.isInitialized) {
      await this.initialize();
    }
    
    if (!this.git) {
      // Simulate branch creation
      return { success: true, data: { branchName } };
    }
    
    try {
      await this.git.checkoutBranch(branchName);
      return { success: true, data: { branchName } };
    } catch (error) {
      return { 
        success: false, 
        error: `Failed to create branch: ${error instanceof Error ? error.message : 'Unknown error'}` 
      };
    }
  }
  
  async commitChanges(message: string, files?: string[]): Promise<GitOpsResult> {
    if (!this.isInitialized) {
      await this.initialize();
    }
    
    if (!this.git) {
      // Simulate commit
      return { 
        success: true, 
        data: { 
          hash: `simulated-${Date.now()}`, 
          message,
          files: files || []
        }
      };
    }
    
    try {
      // Configure Git user if not set
      await this.git.addConfig('user.name', this.config.username || 'omai-bot');
      await this.git.addConfig('user.email', this.config.email || 'omai@orthodoxmetrics.com');
      
      // Add files
      if (files && files.length > 0) {
        await this.git.add(files);
      } else {
        await this.git.add('.');
      }
      
      // Commit
      const result = await this.git.commit(message);
      
      return { 
        success: true, 
        data: { 
          hash: result.commit,
          message,
          files: files || []
        }
      };
    } catch (error) {
      return { 
        success: false, 
        error: `Failed to commit changes: ${error instanceof Error ? error.message : 'Unknown error'}` 
      };
    }
  }
  
  async pushBranch(branchName: string, force: boolean = false): Promise<GitOpsResult> {
    if (!this.isInitialized) {
      await this.initialize();
    }
    
    if (!this.git) {
      // Simulate push
      return { success: true, data: { branchName, pushed: true } };
    }
    
    try {
      const pushOptions = force ? ['--force'] : [];
      await this.git.push('origin', branchName, pushOptions);
      
      return { success: true, data: { branchName, pushed: true } };
    } catch (error) {
      return { 
        success: false, 
        error: `Failed to push branch: ${error instanceof Error ? error.message : 'Unknown error'}` 
      };
    }
  }
  
  async getDiff(branch1: string, branch2: string): Promise<GitDiff> {
    if (!this.isInitialized) {
      await this.initialize();
    }
    
    if (!this.git) {
      // Simulate diff
      return {
        files: ['simulated-file.tsx'],
        additions: 5,
        deletions: 2,
        diff: 'simulated diff output'
      };
    }
    
    try {
      const diff = await this.git.diff([branch1, branch2]);
      const diffSummary = await this.git.diffSummary([branch1, branch2]);
      
      return {
        files: diffSummary.files.map((f: any) => f.file),
        additions: diffSummary.insertions,
        deletions: diffSummary.deletions,
        diff
      };
    } catch (error) {
      return {
        files: [],
        additions: 0,
        deletions: 0,
        diff: ''
      };
    }
  }
  
  async getBranches(): Promise<GitBranch[]> {
    if (!this.isInitialized) {
      await this.initialize();
    }
    
    if (!this.git) {
      // Simulate branches
      return [
        { name: this.config.defaultBranch, isCurrent: true, isRemote: false },
        { name: 'omai-fixes/test-component', isCurrent: false, isRemote: false }
      ];
    }
    
    try {
      const branches = await this.git.branch();
      const allBranches = [...branches.all, ...branches.remotes];
      
      return allBranches.map((branch: string) => ({
        name: branch,
        isCurrent: branch === branches.current,
        isRemote: branch.startsWith('remotes/'),
        lastCommit: undefined // Would need additional call to get this
      }));
    } catch (error) {
      return [];
    }
  }
  
  async checkoutBranch(branchName: string): Promise<GitOpsResult> {
    if (!this.isInitialized) {
      await this.initialize();
    }
    
    if (!this.git) {
      // Simulate checkout
      return { success: true, data: { branchName } };
    }
    
    try {
      await this.git.checkout(branchName);
      return { success: true, data: { branchName } };
    } catch (error) {
      return { 
        success: false, 
        error: `Failed to checkout branch: ${error instanceof Error ? error.message : 'Unknown error'}` 
      };
    }
  }
  
  async mergeBranch(sourceBranch: string, targetBranch: string): Promise<GitOpsResult> {
    if (!this.isInitialized) {
      await this.initialize();
    }
    
    if (!this.git) {
      // Simulate merge
      return { success: true, data: { sourceBranch, targetBranch, merged: true } };
    }
    
    try {
      await this.git.checkout(targetBranch);
      await this.git.merge([sourceBranch]);
      
      return { success: true, data: { sourceBranch, targetBranch, merged: true } };
    } catch (error) {
      return { 
        success: false, 
        error: `Failed to merge branch: ${error instanceof Error ? error.message : 'Unknown error'}` 
      };
    }
  }
  
  async deleteBranch(branchName: string, force: boolean = false): Promise<GitOpsResult> {
    if (!this.isInitialized) {
      await this.initialize();
    }
    
    if (!this.git) {
      // Simulate branch deletion
      return { success: true, data: { branchName, deleted: true } };
    }
    
    try {
      const deleteOptions = force ? ['-D'] : ['-d'];
      await this.git.deleteLocalBranch(branchName, deleteOptions);
      
      return { success: true, data: { branchName, deleted: true } };
    } catch (error) {
      return { 
        success: false, 
        error: `Failed to delete branch: ${error instanceof Error ? error.message : 'Unknown error'}` 
      };
    }
  }
  
  async isConfigured(): Promise<boolean> {
    return gitConfigManager.isConfigured();
  }
  
  async validateRepository(): Promise<GitOpsResult> {
    const configValidation = gitConfigManager.validateConfig();
    if (!configValidation.isValid) {
      return { 
        success: false, 
        error: `Configuration validation failed: ${configValidation.errors.join(', ')}` 
      };
    }
    
    const status = await this.getStatus();
    if (!status.isRepo) {
      return { success: false, error: 'Not a Git repository' };
    }
    
    if (!status.hasRemote) {
      return { success: false, error: 'No remote repository configured' };
    }
    
    return { success: true };
  }
  
  async logGitOpsEvent(event: string, data: any): Promise<void> {
    const logEntry = {
      timestamp: new Date().toISOString(),
      event,
      data,
      user: this.config.username || 'omai-bot'
    };
    
    // In a real implementation, this would write to the configured log file
    console.log('[GitOps]', JSON.stringify(logEntry));
  }
}

export const gitOpsBridge = new GitOpsBridge(); 