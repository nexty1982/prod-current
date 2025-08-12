import { OMAIAgent, AgentTaskResult } from './types';
import { BoundComponent } from '../../../front-end/src/pages/omb/types';
import * as fs from 'fs/promises';
import * as path from 'path';

export default {
  name: "omai-schema-mapper",
  description: "Recommends DB schema if missing, creates migration stub",
  category: "database" as const,
  
  async run(component: BoundComponent): Promise<AgentTaskResult> {
    const migrationPath = `migrations/${component.dbTable}_table.sql`;
    const schemaPath = `database/schemas/${component.dbTable}.sql`;
    
    try {
      // Check if migration exists
      await fs.access(migrationPath);
      
      // Check if schema is properly defined
      const migrationContent = await fs.readFile(migrationPath, 'utf8');
      const hasProperSchema = migrationContent.includes('CREATE TABLE') && 
                            migrationContent.includes(component.dbTable);
      
      if (hasProperSchema) {
        return {
          agent: "omai-schema-mapper",
          componentId: component.id,
          action: "checkDatabaseSchema",
          status: "success",
          result: `✅ Database schema for ${component.dbTable} is properly defined`,
          canAutofix: false,
          timestamp: new Date().toISOString()
        };
      } else {
        return {
          agent: "omai-schema-mapper",
          componentId: component.id,
          action: "checkDatabaseSchema",
          status: "warning",
          result: `⚠️ Migration exists but schema may be incomplete`,
          recommendation: `Review and update schema for ${component.dbTable}`,
          canAutofix: true,
          autofixAction: "updateSchema",
          timestamp: new Date().toISOString()
        };
      }
    } catch (error) {
      // Schema doesn't exist
      return {
        agent: "omai-schema-mapper",
        componentId: component.id,
        action: "checkDatabaseSchema",
        status: "error",
        result: `❌ Database schema for ${component.dbTable} is missing`,
        recommendation: `Create migration and schema files for ${component.dbTable}`,
        canAutofix: true,
        autofixAction: "generateSchema",
        timestamp: new Date().toISOString(),
        metadata: {
          suggestedFields: [
            'id INT PRIMARY KEY AUTO_INCREMENT',
            'created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP',
            'updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP',
            'created_by VARCHAR(255)',
            'status ENUM("active", "inactive") DEFAULT "active"'
          ]
        }
      };
    }
  }
} as OMAIAgent; 