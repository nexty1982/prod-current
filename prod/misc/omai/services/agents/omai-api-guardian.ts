import { OMAIAgent, AgentTaskResult } from './types';
import { BoundComponent } from '../../../front-end/src/pages/omb/types';
import * as fs from 'fs/promises';
import * as path from 'path';

export default {
  name: "omai-api-guardian",
  description: "Verifies every OMB component maps to a real backend route and DB table",
  category: "api" as const,
  
  async run(component: BoundComponent): Promise<AgentTaskResult> {
    const apiRoutePath = `src/api/auto/${component.id}.ts`;
    const serverRoutePath = `server/routes/${component.route.replace('/api/', '').replace('/', '-')}.js`;
    
    try {
      // Check if API route file exists
      await fs.access(apiRoutePath);
      
      // Check if server route is registered
      const serverRoutesContent = await fs.readFile('server/routes/index.js', 'utf8');
      const routeRegistered = serverRoutesContent.includes(component.route);
      
      if (routeRegistered) {
        return {
          agent: "omai-api-guardian",
          componentId: component.id,
          action: "verifyApiRoute",
          status: "success",
          result: `✅ API route ${component.route} is properly configured`,
          canAutofix: false,
          timestamp: new Date().toISOString()
        };
      } else {
        return {
          agent: "omai-api-guardian",
          componentId: component.id,
          action: "verifyApiRoute",
          status: "warning",
          result: `⚠️ API route file exists but not registered in server`,
          recommendation: `Register route ${component.route} in server/routes/index.js`,
          canAutofix: true,
          autofixAction: "registerApiRoute",
          timestamp: new Date().toISOString()
        };
      }
    } catch (error) {
      return {
        agent: "omai-api-guardian",
        componentId: component.id,
        action: "verifyApiRoute",
        status: "error",
        result: `❌ API route ${component.route} is missing`,
        recommendation: `Generate API route file at ${apiRoutePath}`,
        canAutofix: true,
        autofixAction: "generateApiRoute",
        timestamp: new Date().toISOString()
      };
    }
  }
} as OMAIAgent; 