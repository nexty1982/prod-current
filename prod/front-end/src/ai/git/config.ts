export interface GitConfig {
  // Repository settings
  repoPath: string;
  remoteOrigin: string;
  defaultBranch: string;
  omaiBranchPrefix: string;
  
  // Authentication
  authToken?: string;
  username?: string;
  email?: string;
  
  // GitOps settings
  autoCommitEnabled: boolean;
  autoCreatePR: boolean;
  autoMergeEnabled: boolean;
  requireApproval: boolean;
  
  // Thresholds
  commitConfidenceThreshold: number;
  prConfidenceThreshold: number;
  
  // Provider settings
  provider: 'github' | 'gitlab' | 'gitea';
  apiBaseUrl?: string;
  
  // Logging
  logFilePath: string;
  enableDetailedLogging: boolean;
}

export interface GitProviderConfig {
  name: string;
  apiBaseUrl: string;
  tokenEnvVar: string;
  usernameEnvVar: string;
  emailEnvVar: string;
}

export const GIT_PROVIDERS: Record<string, GitProviderConfig> = {
  github: {
    name: 'GitHub',
    apiBaseUrl: 'https://api.github.com',
    tokenEnvVar: 'GITHUB_TOKEN',
    usernameEnvVar: 'GITHUB_USERNAME',
    emailEnvVar: 'GITHUB_EMAIL'
  },
  gitlab: {
    name: 'GitLab',
    apiBaseUrl: 'https://gitlab.com/api/v4',
    tokenEnvVar: 'GITLAB_TOKEN',
    usernameEnvVar: 'GITLAB_USERNAME',
    emailEnvVar: 'GITLAB_EMAIL'
  },
  gitea: {
    name: 'Gitea',
    apiBaseUrl: 'https://gitea.com/api/v1',
    tokenEnvVar: 'GITEA_TOKEN',
    usernameEnvVar: 'GITEA_USERNAME',
    emailEnvVar: 'GITEA_EMAIL'
  }
};

export class GitConfigManager {
  private config: GitConfig;
  
  constructor() {
    this.config = this.loadConfig();
  }
  
  private loadConfig(): GitConfig {
    const provider = (process.env.OMAI_GIT_PROVIDER as 'github' | 'gitlab' | 'gitea') || 'github';
    const providerConfig = GIT_PROVIDERS[provider];
    
    return {
      // Repository settings
      repoPath: process.env.OMAI_GIT_REPO_PATH || '/var/www/orthodoxmetrics',
      remoteOrigin: process.env.OMAI_GIT_REMOTE_ORIGIN || '',
      defaultBranch: process.env.OMAI_GIT_DEFAULT_BRANCH || 'main',
      omaiBranchPrefix: process.env.OMAI_GIT_BRANCH_PREFIX || 'omai-fixes',
      
      // Authentication
      authToken: process.env[providerConfig.tokenEnvVar],
      username: process.env[providerConfig.usernameEnvVar] || 'omai-bot',
      email: process.env[providerConfig.emailEnvVar] || 'omai@orthodoxmetrics.com',
      
      // GitOps settings
      autoCommitEnabled: process.env.OMAI_GIT_AUTO_COMMIT === 'true',
      autoCreatePR: process.env.OMAI_GIT_AUTO_CREATE_PR === 'true',
      autoMergeEnabled: process.env.OMAI_GIT_AUTO_MERGE === 'false', // Default to false for safety
      requireApproval: process.env.OMAI_GIT_REQUIRE_APPROVAL === 'true',
      
      // Thresholds
      commitConfidenceThreshold: parseFloat(process.env.OMAI_GIT_COMMIT_THRESHOLD || '0.7'),
      prConfidenceThreshold: parseFloat(process.env.OMAI_GIT_PR_THRESHOLD || '0.8'),
      
      // Provider settings
      provider,
      apiBaseUrl: process.env.OMAI_GIT_API_BASE_URL || providerConfig.apiBaseUrl,
      
      // Logging
      logFilePath: process.env.OMAI_GIT_LOG_PATH || '/logs/omai/gitops.log',
      enableDetailedLogging: process.env.OMAI_GIT_DETAILED_LOGGING === 'true'
    };
  }
  
  getConfig(): GitConfig {
    return { ...this.config };
  }
  
  updateConfig(updates: Partial<GitConfig>): void {
    this.config = { ...this.config, ...updates };
  }
  
  isConfigured(): boolean {
    return !!(this.config.repoPath && this.config.remoteOrigin && this.config.authToken);
  }
  
  getProviderConfig(): GitProviderConfig {
    return GIT_PROVIDERS[this.config.provider];
  }
  
  validateConfig(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (!this.config.repoPath) {
      errors.push('Repository path is not configured');
    }
    
    if (!this.config.remoteOrigin) {
      errors.push('Remote origin is not configured');
    }
    
    if (!this.config.authToken) {
      errors.push('Authentication token is not configured');
    }
    
    if (!this.config.username || !this.config.email) {
      errors.push('Git user credentials are not configured');
    }
    
    if (this.config.commitConfidenceThreshold < 0 || this.config.commitConfidenceThreshold > 1) {
      errors.push('Commit confidence threshold must be between 0 and 1');
    }
    
    if (this.config.prConfidenceThreshold < 0 || this.config.prConfidenceThreshold > 1) {
      errors.push('PR confidence threshold must be between 0 and 1');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
  
  generateBranchName(componentName: string, date?: Date): string {
    const timestamp = (date || new Date()).toISOString().split('T')[0];
    const sanitizedComponent = componentName.replace(/[^a-zA-Z0-9-]/g, '-').toLowerCase();
    return `${this.config.omaiBranchPrefix}/${timestamp}-${sanitizedComponent}`;
  }
  
  generateCommitMessage(componentName: string, issueSummary: string, confidence: number): string {
    const confidencePercent = Math.round(confidence * 100);
    return `fix(${componentName}): OMAI auto-fix - ${issueSummary}\n\nConfidence: ${confidencePercent}%\nGenerated by OMAI autonomous fix engine`;
  }
  
  generatePRTitle(componentName: string, issueSummary: string): string {
    return `🤖 OMAI Auto-Fix: ${componentName} - ${issueSummary}`;
  }
  
  generatePRDescription(fixData: {
    componentName: string;
    issueSummary: string;
    confidence: number;
    appliedFixes: string[];
    beforeSnapshot?: string;
    afterSnapshot?: string;
    user?: string;
  }): string {
    const confidencePercent = Math.round(fixData.confidence * 100);
    const fixesList = fixData.appliedFixes.map(fix => `- ${fix}`).join('\n');
    
    return `## 🤖 OMAI Autonomous Fix

**Component:** ${fixData.componentName}
**Issue:** ${fixData.issueSummary}
**Confidence:** ${confidencePercent}%
${fixData.user ? `**Approved by:** ${fixData.user}` : '**Auto-generated**'}

### Applied Fixes:
${fixesList}

### Before/After Snapshots:
${fixData.beforeSnapshot ? `\n**Before:**\n\`\`\`json\n${fixData.beforeSnapshot}\n\`\`\`` : ''}
${fixData.afterSnapshot ? `\n**After:**\n\`\`\`json\n${fixData.afterSnapshot}\n\`\`\`` : ''}

---
*This PR was automatically generated by the OMAI autonomous fix engine.*`;
  }
}

export const gitConfigManager = new GitConfigManager(); 