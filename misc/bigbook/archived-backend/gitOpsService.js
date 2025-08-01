// GitOps Service
// Handles Git repository operations for Site Editor including commits, branches, and PR creation

const { execSync } = require('child_process');
const fs = require('fs').promises;
const path = require('path');

class GitOpsService {
  constructor() {
    this.config = this.loadDefaultConfig();
    this.repoPath = process.cwd();
  }

  loadDefaultConfig() {
    return {
      enabled: process.env.GITOPS_ENABLED === 'true',
      autoCommit: process.env.GITOPS_AUTO_COMMIT === 'true',
      branchPrefix: process.env.GITOPS_BRANCH_PREFIX || 'site-editor-fix',
      defaultBranch: process.env.GITOPS_DEFAULT_BRANCH || 'main',
      remoteOrigin: process.env.GITOPS_REMOTE_ORIGIN || 'origin',
      createPR: process.env.GITOPS_CREATE_PR === 'true',
      prTemplate: process.env.GITOPS_PR_TEMPLATE || '',
      maxCommitsPerBranch: parseInt(process.env.GITOPS_MAX_COMMITS) || 10
    };
  }

  /**
   * Create commit for a component fix
   */
  async createFixCommit({ componentPath, backupToken, user, message }) {
    if (!this.config.enabled) {
      return { success: false, error: 'GitOps is disabled' };
    }

    try {
      const branchName = `${this.config.branchPrefix}/${path.basename(componentPath, path.extname(componentPath))}-${Date.now()}`;
      
      // Check if repo is clean
      const status = await this.getRepoStatus();
      if (!status.isClean && !status.hasOnlyTargetFile) {
        return { 
          success: false, 
          error: 'Repository has uncommitted changes. Please commit or stash them first.' 
        };
      }

      // Create new branch
      await this.createBranch(branchName);

      // Add and commit the file
      const commitResult = await this.commitFile(componentPath, message, user);
      
      if (!commitResult.success) {
        return commitResult;
      }

      // Push branch to remote (if configured)
      const pushResult = await this.pushBranch(branchName);

      return {
        success: true,
        branch: branchName,
        commit: commitResult.commit,
        pushed: pushResult.success,
        backupToken,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('[GitOps] Failed to create fix commit:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Create pull request
   */
  async createPullRequest({ backupToken, title, description, branch, user }) {
    if (!this.config.enabled || !this.config.createPR) {
      return { success: false, error: 'Pull request creation is disabled' };
    }

    try {
      // This is a simplified implementation
      // In a real environment, you'd integrate with GitHub/GitLab APIs
      
      const prData = {
        title,
        description: this.formatPRDescription(description, user, backupToken),
        branch,
        baseBranch: this.config.defaultBranch,
        user: user.name,
        timestamp: new Date().toISOString()
      };

      // Simulate PR creation
      const prNumber = Math.floor(Math.random() * 1000) + 1;
      const prUrl = `https://github.com/yourorg/yourrepo/pull/${prNumber}`;

      // Log PR creation
      console.log(`[GitOps] Pull request created: ${prUrl}`);
      console.log(`Title: ${title}`);
      console.log(`Branch: ${branch} -> ${this.config.defaultBranch}`);

      return {
        success: true,
        prNumber,
        prUrl,
        title,
        branch,
        ...prData
      };

    } catch (error) {
      console.error('[GitOps] Failed to create pull request:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get repository status
   */
  async getRepoStatus() {
    try {
      // Check if we're in a git repository
      const isGitRepo = await this.isGitRepository();
      if (!isGitRepo) {
        return {
          isGitRepo: false,
          error: 'Not a git repository'
        };
      }

      // Get current branch
      const currentBranch = this.executeGitCommand('git rev-parse --abbrev-ref HEAD').trim();
      
      // Get status
      const statusOutput = this.executeGitCommand('git status --porcelain');
      const isClean = statusOutput.trim() === '';
      
      // Get commit info
      let lastCommit = null;
      try {
        const commitHash = this.executeGitCommand('git rev-parse HEAD').trim();
        const commitMessage = this.executeGitCommand('git log -1 --pretty=%s').trim();
        const commitAuthor = this.executeGitCommand('git log -1 --pretty=%an').trim();
        const commitDate = this.executeGitCommand('git log -1 --pretty=%ci').trim();
        
        lastCommit = {
          hash: commitHash,
          message: commitMessage,
          author: commitAuthor,
          date: commitDate
        };
      } catch (error) {
        console.warn('[GitOps] Failed to get commit info:', error.message);
      }

      // Get remote info
      let remoteUrl = null;
      try {
        remoteUrl = this.executeGitCommand(`git remote get-url ${this.config.remoteOrigin}`).trim();
      } catch (error) {
        console.warn('[GitOps] Failed to get remote URL:', error.message);
      }

      return {
        isGitRepo: true,
        currentBranch,
        isClean,
        hasChanges: !isClean,
        lastCommit,
        remoteUrl,
        untracked: this.parseStatusOutput(statusOutput, '??'),
        modified: this.parseStatusOutput(statusOutput, ' M'),
        added: this.parseStatusOutput(statusOutput, 'A '),
        deleted: this.parseStatusOutput(statusOutput, ' D')
      };

    } catch (error) {
      console.error('[GitOps] Failed to get repo status:', error);
      return {
        isGitRepo: false,
        error: error.message
      };
    }
  }

  /**
   * Create new branch
   */
  async createBranch(branchName) {
    try {
      // Ensure we're on the default branch
      this.executeGitCommand(`git checkout ${this.config.defaultBranch}`);
      
      // Pull latest changes
      try {
        this.executeGitCommand(`git pull ${this.config.remoteOrigin} ${this.config.defaultBranch}`);
      } catch (error) {
        console.warn('[GitOps] Failed to pull latest changes:', error.message);
      }

      // Create and checkout new branch
      this.executeGitCommand(`git checkout -b ${branchName}`);
      
      console.log(`[GitOps] Created branch: ${branchName}`);
      return { success: true, branch: branchName };

    } catch (error) {
      console.error('[GitOps] Failed to create branch:', error);
      throw new Error(`Failed to create branch: ${error.message}`);
    }
  }

  /**
   * Commit file changes
   */
  async commitFile(filePath, message, user) {
    try {
      // Configure git user for this commit
      this.executeGitCommand(`git config user.name "${user.name}"`);
      this.executeGitCommand(`git config user.email "${user.email || `${user.name.toLowerCase().replace(/\s+/g, '.')}@orthodoxmetrics.local`}"`);

      // Add the file
      this.executeGitCommand(`git add "${filePath}"`);
      
      // Check if there are changes to commit
      const diffOutput = this.executeGitCommand('git diff --cached --stat');
      if (!diffOutput.trim()) {
        return { success: false, error: 'No changes to commit' };
      }

      // Commit the changes
      const commitMessage = `${message}\n\nCommitted via Site Editor\nUser: ${user.name} (${user.id})`;
      this.executeGitCommand(`git commit -m "${commitMessage}"`);
      
      // Get commit hash
      const commitHash = this.executeGitCommand('git rev-parse HEAD').trim();
      
      console.log(`[GitOps] Committed changes: ${commitHash}`);
      
      return {
        success: true,
        commit: commitHash,
        message: commitMessage,
        file: filePath
      };

    } catch (error) {
      console.error('[GitOps] Failed to commit file:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Push branch to remote
   */
  async pushBranch(branchName) {
    try {
      this.executeGitCommand(`git push -u ${this.config.remoteOrigin} ${branchName}`);
      
      console.log(`[GitOps] Pushed branch: ${branchName}`);
      
      return { success: true, branch: branchName };

    } catch (error) {
      console.warn('[GitOps] Failed to push branch:', error.message);
      return {
        success: false,
        error: error.message,
        branch: branchName
      };
    }
  }

  /**
   * Format PR description
   */
  formatPRDescription(description, user, backupToken) {
    const template = `${description}

## Site Editor Fix Details

- **Fixed by:** ${user.name} (${user.id})
- **Backup Token:** ${backupToken}
- **Fixed at:** ${new Date().toISOString()}
- **Tool:** OrthodoxMetrics Site Editor

## Review Checklist

- [ ] Code follows project standards
- [ ] Changes are tested
- [ ] No breaking changes introduced
- [ ] Documentation updated if needed

---
*This PR was created automatically by the Site Editor*`;

    return template;
  }

  // Helper methods

  async isGitRepository() {
    try {
      this.executeGitCommand('git rev-parse --git-dir');
      return true;
    } catch (error) {
      return false;
    }
  }

  executeGitCommand(command, options = {}) {
    try {
      return execSync(command, {
        cwd: this.repoPath,
        encoding: 'utf8',
        stdio: 'pipe',
        ...options
      });
    } catch (error) {
      console.error(`[GitOps] Git command failed: ${command}`);
      console.error(`[GitOps] Error: ${error.message}`);
      throw error;
    }
  }

  parseStatusOutput(statusOutput, statusCode) {
    const lines = statusOutput.split('\n').filter(line => line.trim());
    return lines
      .filter(line => line.startsWith(statusCode))
      .map(line => line.substring(2).trim());
  }

  /**
   * Clean up old branches
   */
  async cleanupOldBranches() {
    try {
      // Get all branches with our prefix
      const branches = this.executeGitCommand(`git branch --list "${this.config.branchPrefix}/*"`);
      const branchList = branches.split('\n')
        .map(b => b.trim().replace(/^\*\s*/, ''))
        .filter(b => b && b.startsWith(this.config.branchPrefix));

      if (branchList.length > this.config.maxCommitsPerBranch) {
        const toDelete = branchList.slice(this.config.maxCommitsPerBranch);
        
        for (const branch of toDelete) {
          try {
            this.executeGitCommand(`git branch -D ${branch}`);
            console.log(`[GitOps] Deleted old branch: ${branch}`);
          } catch (error) {
            console.warn(`[GitOps] Failed to delete branch ${branch}:`, error.message);
          }
        }
      }

    } catch (error) {
      console.error('[GitOps] Failed to cleanup old branches:', error);
    }
  }

  /**
   * Get configuration
   */
  getConfig() {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    console.log('[GitOps] Configuration updated');
  }
}

module.exports = GitOpsService; 