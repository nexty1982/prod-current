import { OMAIAgent, OMAIAgentContext, OMAITaskResult } from './types';
import fs from 'fs/promises';
import path from 'path';

export class SchemaSentinelAgent implements OMAIAgent {
  id = 'omai-schema-sentinel';
  name = 'Schema Sentinel';
  domain = 'records';
  triggers = ['schedule', 'anomaly'];
  canAutofix = false;
  capabilities = ['detect', 'recommend', 'report'];

  async run(context: OMAIAgentContext): Promise<OMAITaskResult> {
    const { tenant, target } = context;
    console.log(`🗄️ Schema Sentinel running for tenant: ${tenant}, target: ${target}`);

    try {
      const issues = await this.validateDatabaseSchemas(tenant);
      const recommendations = await this.generateRecommendations(issues);
      
      return {
        success: true,
        output: `Validated database schemas - found ${issues.length} issues`,
        actions: ['detect', 'recommend'],
        issuesFound: issues.length,
        recommendations
      };
    } catch (error) {
      return {
        success: false,
        output: `Schema validation failed: ${error}`,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  private async validateDatabaseSchemas(tenant?: string): Promise<string[]> {
    const issues: string[] = [];
    
    try {
      // Check for missing schema files
      const schemasDir = path.join(process.cwd(), 'server', 'schemas');
      const expectedSchemas = await this.getExpectedSchemas(tenant);
      const existingSchemas = await this.getExistingSchemas(schemasDir);

      for (const expectedSchema of expectedSchemas) {
        if (!existingSchemas.includes(expectedSchema)) {
          issues.push(`Missing database schema: ${expectedSchema}`);
        }
      }

      // Check for schema syntax errors
      const syntaxIssues = await this.checkSchemaSyntax(schemasDir);
      issues.push(...syntaxIssues);

      // Check for migration files
      const migrationIssues = await this.checkMigrations(tenant);
      issues.push(...migrationIssues);

      console.log(`🔍 Found ${issues.length} schema issues`);
      return issues;
    } catch (error) {
      console.error('Error validating database schemas:', error);
      return [];
    }
  }

  private async getExpectedSchemas(tenant?: string): Promise<string[]> {
    // Base schemas that all tenants should have
    const baseSchemas = [
      'users.sql',
      'records.sql',
      'churches.sql'
    ];

    if (tenant === 'Holy Resurrection') {
      // This tenant needs chrismation schema
      baseSchemas.push('chrismation.sql');
    }

    return baseSchemas;
  }

  private async getExistingSchemas(schemasDir: string): Promise<string[]> {
    try {
      const files = await fs.readdir(schemasDir);
      return files.filter(file => file.endsWith('.sql'));
    } catch (error) {
      console.error('Error reading schemas directory:', error);
      return [];
    }
  }

  private async checkSchemaSyntax(schemasDir: string): Promise<string[]> {
    const issues: string[] = [];
    
    try {
      const files = await fs.readdir(schemasDir);
      
      for (const file of files) {
        if (file.endsWith('.sql')) {
          try {
            const filePath = path.join(schemasDir, file);
            const content = await fs.readFile(filePath, 'utf-8');
            
            // Basic SQL syntax checks
            if (!content.includes('CREATE TABLE') && !content.includes('ALTER TABLE')) {
              issues.push(`Schema file ${file} may not contain valid SQL DDL statements`);
            }
            
            if (!content.includes(';')) {
              issues.push(`Schema file ${file} may be missing statement terminators`);
            }
          } catch (error) {
            issues.push(`Cannot read schema file ${file}: ${error}`);
          }
        }
      }
    } catch (error) {
      console.error('Error checking schema syntax:', error);
    }
    
    return issues;
  }

  private async checkMigrations(tenant?: string): Promise<string[]> {
    const issues: string[] = [];
    
    try {
      const migrationsDir = path.join(process.cwd(), 'server', 'migrations');
      const files = await fs.readdir(migrationsDir);
      
      // Check if there are any pending migrations
      const pendingMigrations = files.filter(file => 
        file.endsWith('.sql') && file.includes('pending')
      );
      
      if (pendingMigrations.length > 0) {
        issues.push(`Found ${pendingMigrations.length} pending database migrations`);
      }
      
      // Check for tenant-specific migrations
      if (tenant === 'Holy Resurrection') {
        const chrismationMigrations = files.filter(file => 
          file.includes('chrismation') && file.endsWith('.sql')
        );
        
        if (chrismationMigrations.length === 0) {
          issues.push('Missing chrismation record migrations for Holy Resurrection');
        }
      }
    } catch (error) {
      console.error('Error checking migrations:', error);
      issues.push('Cannot access migrations directory');
    }
    
    return issues;
  }

  private async generateRecommendations(issues: string[]): Promise<string[]> {
    return issues.map(issue => {
      if (issue.includes('Missing database schema')) {
        const schemaName = issue.split(': ')[1];
        return `Create missing database schema: ${schemaName}`;
      } else if (issue.includes('syntax')) {
        return `Review and fix SQL syntax in schema file`;
      } else if (issue.includes('migrations')) {
        return `Run pending database migrations`;
      } else {
        return `Investigate and resolve: ${issue}`;
      }
    });
  }
}

export const schemaSentinelAgent = new SchemaSentinelAgent(); 