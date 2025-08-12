import { OMAIAgent, AgentTaskResult } from './types';
import { BoundComponent } from '../../../front-end/src/pages/omb/types';
import * as fs from 'fs/promises';
import * as path from 'path';

export default {
  name: "omai-refactor",
  description: "Suggests improved field names, UI consistency, component reuse",
  category: "ui" as const,
  
  async run(component: BoundComponent): Promise<AgentTaskResult> {
    const suggestions: string[] = [];
    const improvements: string[] = [];
    
    // Check component naming consistency
    if (!component.name.match(/^[A-Z][a-zA-Z0-9\s]+$/)) {
      suggestions.push("Component name should follow PascalCase convention");
      improvements.push("Rename component to follow naming conventions");
    }
    
    // Check route naming consistency
    if (!component.route.startsWith('/api/')) {
      suggestions.push("API routes should start with /api/ prefix");
      improvements.push("Update route to follow API naming conventions");
    }
    
    // Check database table naming
    if (!component.dbTable.match(/^[a-z_]+$/)) {
      suggestions.push("Database table names should be lowercase with underscores");
      improvements.push("Update table name to follow database naming conventions");
    }
    
    // Check for potential component reuse
    const similarComponents = await this.findSimilarComponents(component);
    if (similarComponents.length > 0) {
      suggestions.push(`Consider reusing existing components: ${similarComponents.join(', ')}`);
      improvements.push("Refactor to use existing component patterns");
    }
    
    // Check role assignments
    if (component.roles.length === 0) {
      suggestions.push("Component should have at least one access role defined");
      improvements.push("Add appropriate access roles");
    }
    
    if (suggestions.length === 0) {
      return {
        agent: "omai-refactor",
        componentId: component.id,
        action: "analyzeComponentQuality",
        status: "success",
        result: "✅ Component follows best practices and naming conventions",
        canAutofix: false,
        timestamp: new Date().toISOString()
      };
    } else {
      return {
        agent: "omai-refactor",
        componentId: component.id,
        action: "analyzeComponentQuality",
        status: "warning",
        result: `⚠️ Found ${suggestions.length} improvement opportunities`,
        recommendation: suggestions.join('\n'),
        canAutofix: improvements.length > 0,
        autofixAction: improvements.length > 0 ? "applyRefactoring" : undefined,
        timestamp: new Date().toISOString(),
        metadata: {
          suggestions,
          improvements
        }
      };
    }
  },
  
  async findSimilarComponents(component: BoundComponent): Promise<string[]> {
    try {
      const componentsPath = 'services/omb/layouts/omb-components.json';
      const componentsData = await fs.readFile(componentsPath, 'utf8');
      const components = JSON.parse(componentsData);
      
      const similar: string[] = [];
      
      for (const existing of components) {
        if (existing.id !== component.id) {
          // Check for similar functionality
          if (existing.type === component.type && 
              existing.route.includes(component.route.split('/').pop() || '')) {
            similar.push(existing.name);
          }
          
          // Check for similar database tables
          if (existing.dbTable === component.dbTable) {
            similar.push(existing.name);
          }
        }
      }
      
      return [...new Set(similar)];
    } catch (error) {
      return [];
    }
  }
} as OMAIAgent; 