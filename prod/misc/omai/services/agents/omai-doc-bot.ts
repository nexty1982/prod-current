import { OMAIAgent, AgentTaskResult } from './types';
import { BoundComponent } from '../../../front-end/src/pages/omb/types';
import * as fs from 'fs/promises';
import * as path from 'path';

export default {
  name: "omai-doc-bot",
  description: "Ensures every new route/component has Big Book documentation",
  category: "documentation" as const,
  
  async run(component: BoundComponent): Promise<AgentTaskResult> {
    const docPath = `docs/OM-BigBook/pages/components/${component.id}.md`;
    
    try {
      // Check if documentation exists
      await fs.access(docPath);
      
      // Documentation exists - check if it's up to date
      const docContent = await fs.readFile(docPath, 'utf8');
      const hasCurrentInfo = docContent.includes(component.name) && 
                           docContent.includes(component.route) &&
                           docContent.includes(component.dbTable);
      
      if (hasCurrentInfo) {
        return {
          agent: "omai-doc-bot",
          componentId: component.id,
          action: "checkDocumentation",
          status: "success",
          result: "✅ Documentation exists and is up to date",
          canAutofix: false,
          timestamp: new Date().toISOString()
        };
      } else {
        return {
          agent: "omai-doc-bot",
          componentId: component.id,
          action: "checkDocumentation",
          status: "warning",
          result: "⚠️ Documentation exists but may be outdated",
          recommendation: "Update documentation to reflect current component metadata",
          canAutofix: true,
          autofixAction: "regenerateDocumentation",
          timestamp: new Date().toISOString()
        };
      }
    } catch (error) {
      // Documentation doesn't exist
      return {
        agent: "omai-doc-bot",
        componentId: component.id,
        action: "checkDocumentation",
        status: "error",
        result: "❌ Documentation missing",
        recommendation: `Create documentation at ${docPath}`,
        canAutofix: true,
        autofixAction: "generateDocumentation",
        timestamp: new Date().toISOString()
      };
    }
  }
} as OMAIAgent; 