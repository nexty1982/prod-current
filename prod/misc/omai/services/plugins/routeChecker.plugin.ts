import { BoundComponent } from '../../../front-end/src/pages/omb/types';

export default {
  name: "routeChecker",
  description: "Checks if API routes exist for components",
  run: async (component: BoundComponent): Promise<string> => {
    try {
      // Check if the route exists by making a test request
      const response = await fetch(component.route, {
        method: 'HEAD',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      if (response.ok) {
        return `✅ Route ${component.route} is live and accessible`;
      } else if (response.status === 404) {
        return `❌ Route ${component.route} not found (404)`;
      } else {
        return `⚠️ Route ${component.route} exists but returned status ${response.status}`;
      }
    } catch (error) {
      return `❌ Route ${component.route} is not accessible: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  }
}; 