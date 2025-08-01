import { OMAIAgent, OMAIAgentContext, OMAITaskResult } from './types';
import fs from 'fs/promises';
import path from 'path';

export class APIGuardianAgent implements OMAIAgent {
  id = 'omai-api-guardian';
  name = 'API Guardian';
  domain = 'api';
  triggers = ['schedule', 'file change'];
  canAutofix = false;
  capabilities = ['detect', 'recommend', 'report'];

  async run(context: OMAIAgentContext): Promise<OMAITaskResult> {
    const { tenant, target } = context;
    console.log(`🛡️ API Guardian running for tenant: ${tenant}, target: ${target}`);

    try {
      const issues = await this.validateAPIRoutes(tenant);
      const recommendations = await this.generateRecommendations(issues);
      
      return {
        success: true,
        output: `Validated ${issues.length} API route issues`,
        actions: ['detect', 'recommend'],
        issuesFound: issues.length,
        recommendations
      };
    } catch (error) {
      return {
        success: false,
        output: `API validation failed: ${error}`,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  private async validateAPIRoutes(tenant?: string): Promise<string[]> {
    const issues: string[] = [];
    
    try {
      // Check for missing API route files
      const routesDir = path.join(process.cwd(), 'server', 'routes');
      const expectedRoutes = await this.getExpectedRoutes(tenant);
      const existingRoutes = await this.getExistingRoutes(routesDir);

      for (const expectedRoute of expectedRoutes) {
        if (!existingRoutes.includes(expectedRoute)) {
          issues.push(`Missing API route: ${expectedRoute}`);
        }
      }

      // Check for route file syntax errors
      const syntaxIssues = await this.checkRouteSyntax(routesDir);
      issues.push(...syntaxIssues);

      console.log(`🔍 Found ${issues.length} API route issues`);
      return issues;
    } catch (error) {
      console.error('Error validating API routes:', error);
      return [];
    }
  }

  private async getExpectedRoutes(tenant?: string): Promise<string[]> {
    // Based on tenant configuration, determine expected routes
    const baseRoutes = [
      'users.js',
      'records.js',
      'admin.js',
      'auth.js'
    ];

    if (tenant === 'Holy Resurrection') {
      // This tenant needs chrismation records
      baseRoutes.push('chrismation.js');
    }

    return baseRoutes;
  }

  private async getExistingRoutes(routesDir: string): Promise<string[]> {
    try {
      const files = await fs.readdir(routesDir);
      return files.filter(file => file.endsWith('.js') || file.endsWith('.ts'));
    } catch (error) {
      console.error('Error reading routes directory:', error);
      return [];
    }
  }

  private async checkRouteSyntax(routesDir: string): Promise<string[]> {
    const issues: string[] = [];
    
    try {
      const files = await fs.readdir(routesDir);
      
      for (const file of files) {
        if (file.endsWith('.js') || file.endsWith('.ts')) {
          try {
            const filePath = path.join(routesDir, file);
            const content = await fs.readFile(filePath, 'utf-8');
            
            // Basic syntax checks
            if (!content.includes('router.') && !content.includes('app.')) {
              issues.push(`Route file ${file} may not contain valid Express.js routes`);
            }
            
            if (!content.includes('module.exports') && !content.includes('export')) {
              issues.push(`Route file ${file} may not be properly exported`);
            }
          } catch (error) {
            issues.push(`Cannot read route file ${file}: ${error}`);
          }
        }
      }
    } catch (error) {
      console.error('Error checking route syntax:', error);
    }
    
    return issues;
  }

  private async generateRecommendations(issues: string[]): Promise<string[]> {
    return issues.map(issue => {
      if (issue.includes('Missing API route')) {
        const routeName = issue.split(': ')[1];
        return `Create missing API route file: ${routeName}`;
      } else if (issue.includes('syntax')) {
        return `Review and fix syntax in route file`;
      } else {
        return `Investigate and resolve: ${issue}`;
      }
    });
  }
}

export const apiGuardianAgent = new APIGuardianAgent(); 